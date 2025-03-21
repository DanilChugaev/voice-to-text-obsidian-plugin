import { Plugin, Editor, MarkdownView, App, PluginManifest } from 'obsidian';
import { writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import { Language, TranslationKey, t } from './locales';
import { logger } from './logger';
import { notify } from './notify';

const execPromise = promisify(exec);

export default class VoiceToTextPlugin extends Plugin {
	lang: Language = 'en';
	plugin_path = '';
	is_recording = false;

	t: (key: TranslationKey) => string;
	notify: (key: TranslationKey | string) => void;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.t = t.bind(this);
		this.notify = notify.bind(this);
	}

	async onload() {
		this.plugin_path = `${this.app.vault.adapter.basePath}/.obsidian/plugins/voice-to-text`;
		this.setInterfacePluginLang();

		logger('plugin started');

		// todo исключить параллельные старты
		this.addCommand({
			id: 'record-and-transcribe',
			name: this.t('recordAndTranscribeAudio'),
			editorCallback: async (editor: Editor) => this.transcribeAudio(editor),
		});

		this.registerEvent(
			this.app.workspace.on('file-open', (file) => {
				logger('file opened: ', file?.path);

				const view = this.app.workspace.getActiveViewOfType(MarkdownView);

				if (view) {
					this.addRecordButtonToEditor(view);
					this.addStopButtonToEditor(view);
				}
			})
		);
	}

	setInterfacePluginLang() {
		// todo либо из настроек брать
		if (this.app.setting.headerEl?.innerText === 'Настройки') {
			this.lang = 'ru';
		} else {
			this.lang = 'en';
		}

		logger('setting interface plugin lang: ', this.lang);
	}

	addRecordButtonToEditor(markdownView: MarkdownView) {
		const editorEl = markdownView.containerEl.querySelector('.markdown-source-view');

		if (!editorEl) return;

		let toolbar = editorEl.querySelector('.voice-to-text-toolbar');

		if (!toolbar) {
			toolbar = document.createElement('div');
			toolbar.className = 'voice-to-text-toolbar';
		}

		const button = document.createElement('button');
		button.textContent = '🎙️ Record';
		button.className = 'voice-to-text-button';
		button.title = this.t('recordAndTranscribeAudio');

		button.addEventListener('click', () => {
			this.transcribeAudio(markdownView.editor);
		});

		toolbar.appendChild(button);
		editorEl.insertBefore(toolbar, editorEl.firstChild);
	}

	addStopButtonToEditor(markdownView: MarkdownView) {
		const editorEl = markdownView.containerEl.querySelector('.markdown-source-view');

		if (!editorEl) return;

		let toolbar = editorEl.querySelector('.voice-to-text-toolbar')

		if (!toolbar) {
			toolbar = document.createElement('div');
			toolbar.className = 'voice-to-text-toolbar';
		}

		const button = document.createElement('button');
		button.textContent = '⏹️ Stop';
		button.className = 'voice-to-text-button';
		button.title = this.t('stopRecordAndTranscribeAudio');

		button.addEventListener('click', () => {
			this.is_recording = false;
			this.notify('recordingStop');
		});

		toolbar.appendChild(button);
		editorEl.insertBefore(toolbar, editorEl.lastChild);
	}

	async saveBlobAsWebMAudio(audioBlob: Blob): Promise<{ webmPath: string }> {
		const webmPath = `${this.plugin_path}/temp_audio.webm`;
		const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
		writeFileSync(webmPath, audioBuffer);

		return { webmPath }
	}

	async convertWebMAudioToWav(webmPath: string): Promise<{ wavPath: string }> {
		// Converting WebM to WAV (mono, 16-bit, 16 kHz)
		const wavPath = `${this.plugin_path}/temp_audio.wav`;
		const ffmpegPath = '/opt/homebrew/bin/ffmpeg';
		await execPromise(`${ffmpegPath} -y -i "${webmPath}" -acodec pcm_s16le -ac 1 -ar 16000 "${wavPath}"`);

		return { wavPath }
	}

	async useVoskForConvertingVoiceToText(wavPath: string): Promise<{ text: string }>  {
		// Start python script with Vosk processing
		const pythonPath = '/Users/oskelly/.pyenv/shims/python';
		const scriptPath = `${this.plugin_path}/transcribe.py`;
		const modelPath = `${this.plugin_path}/vosk-model`;
		const { stdout } = await execPromise(`${pythonPath} "${scriptPath}" "${wavPath}" "${modelPath}"`);

		const text = stdout.trim();

		return { text }
	}

	async transcribeAudio(editor: Editor) {
		try {
			const audioBlob = await this.recordAudio();

			this.notify('processingAudio');

			const { webmPath } = await this.saveBlobAsWebMAudio(audioBlob);
			const { wavPath } = await this.convertWebMAudioToWav(webmPath);
			const { text } = await this.useVoskForConvertingVoiceToText(wavPath);

			// todo: вставлять в конец текста
			// todo: перед вставкой добавить отступ и дату и время заметки
			editor.replaceSelection(text || this.t('emptyTranscription'));

			this.notify('transcriptionCompleted');
		} catch (error: any) {
			this.notify(`${this.t('error')} ${error.message}`);
			console.error(error);
		}
	}

	async recordAudio(): Promise<Blob> {
		this.notify('recordingStarted');
		this.is_recording = true;

		const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
		const recorder = new MediaRecorder(stream);
		const chunks: Blob[] = [];

		recorder.ondataavailable = (e) => chunks.push(e.data);
		recorder.start();

		return new Promise((resolve) => {
			setInterval(() => {
				// todo: тут обновлять время записи
				if (!this.is_recording) {
					recorder.stop();
					stream.getTracks().forEach(track => track.stop());
				}
			}, 1000)

			recorder.onstop = () => resolve(new Blob(chunks, { type: 'audio/webm' }));
		});
	}
}
