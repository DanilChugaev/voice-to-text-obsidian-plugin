import { Plugin, Editor, MarkdownView, App, PluginManifest, Notice } from 'obsidian';
import { writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import { t } from './locales';
import { logInfo, logWarn, logError } from './logger';

const execPromise = promisify(exec);

export default class VoiceToTextPlugin extends Plugin {
	plugin_path = '';
	is_recording = false;
	is_processing = false;
	editor_element: Element | null = null;
	record_button: HTMLButtonElement | null = null;
	record_button_text: HTMLButtonElement | null = null;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.plugin_path = `${this.app.vault.adapter.basePath}/.obsidian/plugins/voice-to-text`;
	}

	async onload() {
		await logInfo(this.plugin_path, 'Plugin started');

		this.addCommand({
			id: 'record-and-transcribe',
			name: t('recordAndTranscribeAudio'),
			editorCallback: async (editor: Editor) => this.transcribeAudio(editor),
		});

		this.registerEvent(
			this.app.workspace.on('file-open', async (file) => {
				await logInfo(this.plugin_path, `File opened: ${file?.path || ''}`);

				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);

				if (markdownView) {
					await this.addRecordButtonToEditor(markdownView);
				} else {
					await logWarn(this.plugin_path, 'No MarkdownView found for file-open event');
				}
			})
		);
	}

	async addRecordButtonToEditor(markdownView: MarkdownView) {
		this.editor_element = markdownView.containerEl.querySelector('.markdown-source-view');

		if (!this.editor_element) {
			await logWarn(this.plugin_path, 'Markdown source view element not found');

			return;
		}

		this.record_button = this.editor_element.querySelector('.voice-to-text-button');

		if (!this.record_button) {
			await logInfo(this.plugin_path, 'Creating new record button');

			this.record_button = document.createElement('button');
			this.record_button.classList.add('voice-to-text-button');
			this.record_button.innerHTML = `
				<svg
				  xmlns="http://www.w3.org/2000/svg"
				  width="20"
				  height="20"
				  viewBox="0 0 47.964 47.965"
				  class="voice-to-text-button__record-icon"
				>
				  <path d="M23.982 35.268c5.531 0 10.033-4.635 10.033-10.332V10.333C34.015 4.635 29.513 0 23.982 0 18.45 0 13.95 4.635 13.95 10.333v14.604c.001 5.696 4.501 10.331 10.032 10.331zm5.238-10.33c0 2.974-2.35 5.395-5.238 5.395s-5.238-2.42-5.238-5.395V10.333c0-2.974 2.35-5.395 5.238-5.395s5.238 2.42 5.238 5.395v14.605z" fill="currentColor"/>
				  <path d="M40.125 29.994c0-1.361-1.222-2.469-2.72-2.469-1.5 0-2.721 1.107-2.721 2.469 0 4.042-3.621 7.329-8.074 7.329h-5.257c-4.453 0-8.074-3.287-8.074-7.329 0-1.361-1.221-2.469-2.721-2.469-1.499 0-2.719 1.107-2.719 2.469 0 6.736 6.014 12.221 13.424 12.266v.766h-5.944c-1.499 0-2.72 1.107-2.72 2.47s1.221 2.47 2.72 2.47h17.325c1.5 0 2.721-1.107 2.721-2.47s-1.221-2.47-2.721-2.47h-5.942v-.766c7.409-.045 13.423-5.53 13.423-12.266z" fill="currentColor"/>
				</svg>
				<span class="voice-to-text-button__stop-icon"></span>
				<span class="voice-to-text-button__recording-text">${t('startRecording')}</span>
			  `;

			this.record_button_text = this.record_button.querySelector('.voice-to-text-button__recording-text');

			this.record_button.addEventListener('click', async () => {
				if (!this.is_recording && !this.is_processing) {
					await logInfo(this.plugin_path, 'Starting recording');

					this.record_button!.classList.add('voice-to-text-button--active');
					this.record_button_text!.textContent = t('recordingInProgress');

					this.transcribeAudio(markdownView.editor);
				} else if (this.is_recording && !this.is_processing) {
					await logInfo(this.plugin_path, 'Stopping recording, starting processing');

					this.record_button!.classList.remove('voice-to-text-button--active');
					this.record_button!.classList.add('voice-to-text-button--processing');
					this.record_button_text!.textContent = t('transcriptionInProgress');
					this.is_recording = false;
					this.is_processing = true;
				}
			});

			this.editor_element.appendChild(this.record_button);
		}
	}

	async saveBlobAsWebMAudio(audioBlob: Blob): Promise<{ webmPath: string }> {
		const webmPath = `${this.plugin_path}/temp_audio.webm`;
		const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
		writeFileSync(webmPath, audioBuffer);

		await logInfo(this.plugin_path, `Saved audio blob to ${webmPath}`);

		return { webmPath };
	}

	async convertWebMAudioToWav(webmPath: string): Promise<{ wavPath: string }> {
		const wavPath = `${this.plugin_path}/temp_audio.wav`;
		const ffmpegPath = '/opt/homebrew/bin/ffmpeg';

		await logInfo(this.plugin_path, `Converting ${webmPath} to WAV`);

		await execPromise(`${ffmpegPath} -y -i "${webmPath}" -acodec pcm_s16le -ac 1 -ar 16000 "${wavPath}"`);

		await logInfo(this.plugin_path, `Converted to ${wavPath}`);

		return { wavPath };
	}

	async useVoskForConvertingVoiceToText(wavPath: string): Promise<{ text: string }> {
		const pythonPath = '/Users/oskelly/.pyenv/shims/python';
		const scriptPath = `${this.plugin_path}/transcribe.py`;
		const modelPath = `${this.plugin_path}/vosk-model`;

		await logInfo(this.plugin_path, `Starting Vosk transcription with ${wavPath}`);

		const { stdout, stderr } = await execPromise(`${pythonPath} "${scriptPath}" "${wavPath}" "${modelPath}"`);

		if (stderr) await logWarn(this.plugin_path, `Vosk stderr: ${stderr}`);

		const text = stdout.trim();

		await logInfo(this.plugin_path, `Transcription result: ${text}`);

		return { text };
	}

	async insertTextToEditor(editor: Editor, text: string) {
		const transcribedText = text || t('emptyTranscription');
		const totalLines = editor.lineCount();

		editor.setCursor({ line: totalLines, ch: 0 });

		const currentText = editor.getValue();
		const newText = `\n\n${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}\n${transcribedText}`;

		editor.setValue(currentText + newText);

		await logInfo(this.plugin_path, `Inserted text at line ${totalLines}: ${transcribedText}`);
	}

	async transcribeAudio(editor: Editor) {
		try {
			if (this.is_recording || this.is_processing) {
				await logWarn(this.plugin_path, 'Transcription skipped: already recording or processing');
				return;
			}

			const audioBlob = await this.recordAudio();
			await logInfo(this.plugin_path, 'Audio recording completed');

			const { webmPath } = await this.saveBlobAsWebMAudio(audioBlob);
			const { wavPath } = await this.convertWebMAudioToWav(webmPath);
			const { text } = await this.useVoskForConvertingVoiceToText(wavPath);

			await this.insertTextToEditor(editor, text);

			this.record_button!.classList.remove('voice-to-text-button--processing');
			this.record_button_text!.textContent = t('startRecording');
			this.is_processing = false;

			const transcriptionCompletedText = t('transcriptionCompleted');
			new Notice(transcriptionCompletedText);

			await logInfo(this.plugin_path, transcriptionCompletedText);
		} catch (error: any) {
			await logError(this.plugin_path, `Transcription failed: ${error.message}`);

			new Notice(`${t('error')} ${error.message}`);

			this.record_button!.classList.remove('voice-to-text-button--active', 'voice-to-text-button--processing');
			this.is_recording = false;
			this.is_processing = false;
		}
	}

	async recordAudio(): Promise<Blob> {
		await logInfo(this.plugin_path, 'Requesting microphone access');

		this.is_recording = true;

		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const recorder = new MediaRecorder(stream);
		const chunks: Blob[] = [];

		recorder.ondataavailable = (e) => chunks.push(e.data);
		recorder.start();

		await logInfo(this.plugin_path, 'Recording started');

		return new Promise((resolve) => {
			const interval = setInterval(() => {
				if (!this.is_recording) {
					recorder.stop();
					stream.getTracks().forEach(track => track.stop());
					clearInterval(interval);
					logInfo(this.plugin_path, 'Recording stopped');
				}
			}, 1000);

			recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
		});
	}
}
