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
	is_processing = false;
	editor_element: Element | null = null;
	record_button: HTMLButtonElement | null = null;
	record_button_text: HTMLButtonElement | null = null;

	t: (key: TranslationKey) => string;
	notify: (key: TranslationKey | string) => void;

	constructor(app: App, manifest: PluginManifest) {
		super(app, manifest);

		this.t = t.bind(this);
		this.notify = notify.bind(this);
		this.plugin_path = `${this.app.vault.adapter.basePath}/.obsidian/plugins/voice-to-text`;
	}

	async onload() {
		logger('plugin started');

		this.setInterfacePluginLang();

		this.addCommand({
			id: 'record-and-transcribe',
			name: this.t('recordAndTranscribeAudio'),
			editorCallback: async (editor: Editor) => this.transcribeAudio(editor),
		});

		this.registerEvent(
			// todo: добавить события закрытия вкладки и остановки записи
			// todo: записывать в ту заметку, на которой началась запись
			this.app.workspace.on('file-open', (file) => {
				const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);

				if (markdownView) {
					this.addRecordButtonToEditor(markdownView);
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
		this.editor_element = markdownView.containerEl.querySelector('.markdown-source-view');

		if (!this.editor_element) return;

		this.record_button = this.editor_element!.querySelector('.voice-to-text-button');

		if (!this.record_button) {
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
				<span class="voice-to-text-button__recording-text">${this.t('startRecording')}</span>
			`;

			this.record_button_text = this.record_button!.querySelector(`.voice-to-text-button__recording-text`);

			this.record_button.addEventListener('click', () => {
				if (!this.is_recording && !this.is_processing) {
					this.record_button!.classList.add('voice-to-text-button--active');
					this.record_button_text!.textContent = this.t('recordingInProgress');

					this.transcribeAudio(markdownView.editor);

					this.is_recording = true;
				} else if (this.is_recording && !this.is_processing) {
					this.record_button!.classList.remove('voice-to-text-button--active');
					this.record_button!.classList.add('voice-to-text-button--processing');
					this.record_button_text!.textContent = this.t('transcriptionInProgress');

					this.is_recording = false;
					this.is_processing = true;
				}
			});

			this.editor_element!.appendChild(this.record_button);
		}
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

	insertTextToEditor(editor: Editor, text: string) {
		// todo: вставлять в конец текста
		// todo: перед вставкой добавить отступ и дату и время заметки
		// editor. replaceSelection(text || this.t('emptyTranscription'));

		const transcribedText = text || this.t('emptyTranscription');
		// Перемещаем курсор в конец и добавляем текст с отступом
		const totalLines = editor.lineCount(); // Количество строк в документе
		editor.setCursor({ line: totalLines, ch: 0 }); // Курсор в конец
		const currentText = editor.getValue(); // Текущий текст
		const newText = `\n\n${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString()}\n${transcribedText}`;
		editor.setValue(currentText + newText);
	}

	async transcribeAudio(editor: Editor) {
		try {
			if (this.is_recording || this.is_processing) return

			const audioBlob = await this.recordAudio();

			const { webmPath } = await this.saveBlobAsWebMAudio(audioBlob);
			const { wavPath } = await this.convertWebMAudioToWav(webmPath);
			const { text } = await this.useVoskForConvertingVoiceToText(wavPath);

			this.insertTextToEditor(editor, text);

			this.record_button!.classList.remove('voice-to-text-button--processing');
			this.record_button_text!.textContent = this.t('startRecording');

			this.is_processing = false;

			this.notify('transcriptionCompleted');
		} catch (error: any) {
			this.notify(`${this.t('error')} ${error.message}`);
			console.error(error);

			this.record_button!.classList.remove('voice-to-text-button--active', 'voice-to-text-button--processing');
		}
	}

	async recordAudio(): Promise<Blob> {
		// this.notify('recordingStarted');

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
