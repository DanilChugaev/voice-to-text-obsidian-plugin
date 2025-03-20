import { TranslationKey } from './locales';
import { Notice } from 'obsidian';
import { logger } from './logger';

export function notify(this: { t: (key: TranslationKey) => string }, key: TranslationKey | string): void {
	const text = this.t(key as TranslationKey) ?? key

	new Notice(text);
	logger(text);
}
