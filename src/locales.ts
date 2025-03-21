const en = {
	recordAndTranscribeAudio: 'Record and transcribe audio',
	stopRecordAndTranscribeAudio: 'Stop record and transcribe audio',
	processingAudio: 'Processing audio...',
	recordingStarted: 'Recording started...',
	recordingStop: 'Recording stop',
	transcriptionCompleted: 'Transcription completed!',
	error: 'Error:',
	emptyTranscription: 'Empty transcription'
} as const

const ru = {
	recordAndTranscribeAudio: 'Запись и расшифровка аудио',
	stopRecordAndTranscribeAudio: 'Остановить запись и расшифровать аудио',
	processingAudio: 'Обрабатываем аудио...',
	recordingStarted: 'Запись началась...',
	recordingStop: 'Запись остановилась',
	transcriptionCompleted: 'Расшифровка завершена!',
	error: 'Ошибка:',
	emptyTranscription: 'Пустая расшифровка'
} as const

export const locales = {
	en,
	ru,
} as const

export type Language = keyof typeof locales;
export type TranslationKey = keyof typeof en;

export function t(this: { lang: Language }, key: TranslationKey): string {
	return locales[this.lang][key];
}
