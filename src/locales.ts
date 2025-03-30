import { moment } from 'obsidian';

const en = {
	recordAndTranscribeAudio: 'Record and transcribe audio',
	transcriptionCompleted: 'Transcription completed!',
	error: 'Error:',
	emptyTranscription: 'Empty transcription',
	startRecording: 'Start recording',
	recordingInProgress: 'Recording in progress...',
	transcriptionInProgress: 'Transcription in progress...'
} as const

const ru = {
	recordAndTranscribeAudio: 'Запись и расшифровка аудио',
	transcriptionCompleted: 'Расшифровка завершена!',
	error: 'Ошибка:',
	emptyTranscription: 'Пустая расшифровка',
	startRecording: 'Начать запись',
	recordingInProgress: 'Идет запись...',
	transcriptionInProgress: 'Идет расшифровка...'
} as const

export const locales = {
	en,
	ru,
} as const

export type Language = keyof typeof locales;
export type TranslationKey = keyof typeof en;

const locale: Language = moment.locale() as Language;

export function t(key: TranslationKey): string {
	return (locale && locales[locale][key]) || en[key];
}
