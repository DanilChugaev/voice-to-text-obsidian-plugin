import { Plugin, Notice, Editor } from 'obsidian';
import { writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export default class VoiceToTextPlugin extends Plugin {
	async onload() {
		console.log('Plugin onload called');
		this.addCommand({
			id: 'record-and-transcribe',
			name: 'Record and Transcribe Audio',
			editorCallback: async (editor: Editor) => this.transcribeAudio(editor),
		});

		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				console.log('File opened:', file.path);
				const view = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);

				if (view) {
					// Добавляем кнопку при открытии файла
					this.addButtonToEditor(view);
				}
			})
		);

		// Добавляем стили
		this.addStyle();
	}

	addButtonToEditor(markdownView: any) {
		const editorEl = markdownView.containerEl.querySelector('.markdown-source-view');
		if (!editorEl || editorEl.querySelector('.voice-to-text-toolbar')) return; // Проверяем, добавлена ли уже кнопка

		const toolbar = document.createElement('div');
		toolbar.className = 'voice-to-text-toolbar';

		const button = document.createElement('button');
		button.textContent = '🎙️ Record';
		button.className = 'voice-to-text-button';
		button.title = 'Record and transcribe audio';

		button.addEventListener('click', () => {
			this.transcribeAudio(markdownView.editor);
		});

		toolbar.appendChild(button);
		editorEl.insertBefore(toolbar, editorEl.firstChild);
	}

	async saveBlobAsWebMAudio(audioBlob: Blob): Promise<{ webmPath: string }> {
		// показывать уведомления о конкретном процессе в режиме разработки
		new Notice('Processing audio...');

		// Сохраняем аудио как WebM
		const webmPath = `${this.app.vault.adapter.basePath}/temp_audio.webm`;
		const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
		writeFileSync(webmPath, audioBuffer);

		return { webmPath }
	}

	async convertWebMAudioToWav(webmPath: string): Promise<{ wavPath: string }> {
		// Конвертируем WebM в WAV (моно, 16-bit, 16 кГц)
		const wavPath = `${this.app.vault.adapter.basePath}/temp_audio.wav`;
		const ffmpegPath = '/opt/homebrew/bin/ffmpeg';
		await execPromise(`${ffmpegPath} -y -i "${webmPath}" -acodec pcm_s16le -ac 1 -ar 16000 "${wavPath}"`);

		return { wavPath }
	}

	async useVoskForConvertingVoiceToText(wavPath: string): Promise<{ text: string }>  {
		// Вызываем Vosk
		const pythonPath = '/Users/oskelly/.pyenv/shims/python';
		const scriptPath = `${this.app.vault.adapter.basePath}/transcribe_vosk.py`;
		const { stdout } = await execPromise(`${pythonPath} "${scriptPath}" "${wavPath}"`);

		const text = stdout.trim();

		return { text }
	}

	// insertTextOnEditor(text: string): void {
	// 	const editor = this.app.workspace.activeLeaf.view.editor;
	// 	editor.insertText(text || 'No transcription available');
	// }

	async transcribeAudio(editor: Editor) {
		try {
			const audioBlob = await this.recordAudio();

			const { webmPath } = await this.saveBlobAsWebMAudio(audioBlob);
			const { wavPath } = await this.convertWebMAudioToWav(webmPath);
			const { text } = await this.useVoskForConvertingVoiceToText(wavPath);

			// this.insertTextOnEditor(text);
			editor.replaceSelection(text || 'No transcription available');

			new Notice('Transcription completed!');
		} catch (error) {
			new Notice('Error: ' + error.message);
			console.error(error);
		}
	}

	async recordAudio(): Promise<Blob> {
		new Notice('Recording started... ');

		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const recorder = new MediaRecorder(stream);
		const chunks: Blob[] = [];

		recorder.ondataavailable = (e) => chunks.push(e.data);
		recorder.start();

		return new Promise((resolve) => {
			setTimeout(() => {
				recorder.stop();
				stream.getTracks().forEach(track => track.stop());
			}, 5000);

			recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
		});
	}

	addStyle() {
		const style = document.createElement('style');
		style.textContent = `
      .voice-to-text-toolbar {
        padding: 5px;
        background: var(--background-secondary);
        border-bottom: 1px solid var(--background-modifier-border);
      }
      .voice-to-text-button {
        padding: 4px 8px;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      .voice-to-text-button:hover {
        background: var(--interactive-accent-hover);
      }
    `;
		document.head.appendChild(style);
	}
}
