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
	record_button_text: HTMLElement | null = null;

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

			this.record_button = this.editor_element.createEl('button', {
				cls: 'voice-to-text-button',
			});

			const recordIcon = this.record_button.createEl('span', {
				cls: 'voice-to-text-button__record-icon',
			});
			const stopIcon = this.record_button.createEl('span', {
				cls: 'voice-to-text-button__stop-icon',
			});

			this.record_button_text = this.record_button.createEl('span', {
				cls: 'voice-to-text-button__recording-text',
				text: t('startRecording'),
			});

			this.record_button.appendChild(recordIcon);
			this.record_button.appendChild(stopIcon);
			this.record_button.appendChild(this.record_button_text);

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
