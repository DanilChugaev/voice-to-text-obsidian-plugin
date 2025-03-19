import { Plugin, Notice } from 'obsidian';
import { writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export default class VoiceToTextPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: 'record-and-transcribe',
			name: 'Record and Transcribe Audio',
			callback: async () => {
				try {
					new Notice('Recording started...');
					const audioBlob = await this.recordAudio();
					new Notice('Processing audio...');

					// Сохраняем аудио как WebM
					const webmPath = `${this.app.vault.adapter.basePath}/temp_audio.webm`;
					const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
					writeFileSync(webmPath, audioBuffer);

					// Конвертируем WebM в WAV (моно, 16-bit, 16 кГц)
					const wavPath = `${this.app.vault.adapter.basePath}/temp_audio.wav`;
					const ffmpegPath = '/opt/homebrew/bin/ffmpeg'; // Замени на свой путь (which ffmpeg)
					await execPromise(`${ffmpegPath} -y -i "${webmPath}" -acodec pcm_s16le -ac 1 -ar 16000 "${wavPath}"`);

					// Вызываем Vosk
					const pythonPath = '/Users/oskelly/.pyenv/shims/python'; // Или свой путь (which python)
					const scriptPath = `${this.app.vault.adapter.basePath}/transcribe_vosk.py`;
					const { stdout, stderr } = await execPromise(`${pythonPath} "${scriptPath}" "${wavPath}"`);

					// console.log('STDOUT:', stdout);
					// console.log('STDERR:', stderr);
					// if (stderr && !stderr.includes('FP16')) throw new Error(stderr); // Игнорируем предупреждения FP16, если будут

					const transcribedText = stdout.trim();
					const editor = this.app.workspace.activeLeaf.view.editor;
					editor.insertText(transcribedText || 'No transcription available');
					new Notice('Transcription completed!');
				} catch (error) {
					new Notice('Error: ' + error.message);
					console.error(error);
				}
			},
		});
	}

	async recordAudio(): Promise<Blob> {
		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const recorder = new MediaRecorder(stream);
		const chunks: Blob[] = [];

		recorder.ondataavailable = (e) => chunks.push(e.data);
		recorder.start();

		return new Promise((resolve) => {
			setTimeout(() => {
				recorder.stop();
				stream.getTracks().forEach(track => track.stop());
			}, 500000); // 5 секунд записи
			recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
		});
	}
}
