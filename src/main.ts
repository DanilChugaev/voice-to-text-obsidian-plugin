import {Plugin, Notice, Editor, MarkdownView, App, PluginManifest} from 'obsidian';
import { writeFileSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

import { Language, TranslationKey, t } from './locales';
import { logger } from './logger';
import { notify } from './notify';

const execPromise = promisify(exec);

export default class VoiceToTextPlugin extends Plugin {
	lang: Language = 'en';
	t: (key: TranslationKey) => string;
	notify: (key: TranslationKey | string) => void;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);
		this.t = t.bind(this);
		this.notify = notify.bind(this);
	}

	async onload() {
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
					this.addButtonToEditor(view);
				}
			})
		);

		this.addStyle();
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

	addButtonToEditor(markdownView: any) {
		const editorEl = markdownView.containerEl.querySelector('.markdown-source-view');
		if (!editorEl || editorEl.querySelector('.voice-to-text-toolbar')) return;

		const toolbar = document.createElement('div');
		toolbar.className = 'voice-to-text-toolbar';

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

	async saveBlobAsWebMAudio(audioBlob: Blob): Promise<{ webmPath: string }> {
		const webmPath = `${this.app.vault.adapter.basePath}/temp_audio.webm`;
		const audioBuffer = Buffer.from(await audioBlob.arrayBuffer());
		writeFileSync(webmPath, audioBuffer);

		return { webmPath }
	}

	async convertWebMAudioToWav(webmPath: string): Promise<{ wavPath: string }> {
		// Converting WebM to WAV (mono, 16-bit, 16 kHz)
		const wavPath = `${this.app.vault.adapter.basePath}/temp_audio.wav`;
		const ffmpegPath = '/opt/homebrew/bin/ffmpeg';
		await execPromise(`${ffmpegPath} -y -i "${webmPath}" -acodec pcm_s16le -ac 1 -ar 16000 "${wavPath}"`);

		return { wavPath }
	}

	async useVoskForConvertingVoiceToText(wavPath: string): Promise<{ text: string }>  {
		// Start python script with Vosk processing
		const pythonPath = '/Users/oskelly/.pyenv/shims/python';
		const scriptPath = `${this.app.vault.adapter.basePath}/transcribe_vosk.py`;
		const { stdout } = await execPromise(`${pythonPath} "${scriptPath}" "${wavPath}"`);

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

			editor.replaceSelection(text || this.t('emptyTranscription'));

			this.notify('transcriptionCompleted');
		} catch (error: any) {
			this.notify(`${this.t('error')} ${error.message}`);
			console.error(error);
		}
	}

	async recordAudio(): Promise<Blob> {
		this.notify('recordingStarted');

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
