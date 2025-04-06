import { appendFile, statSync, renameSync, existsSync } from 'fs';
import { promisify } from 'util';

const appendFileAsync = promisify(appendFile);
const isProd = process.env.NODE_ENV === 'production';

interface LoggerOptions {
	level: 'info' | 'warn' | 'error';
	message: string;
}

const MAX_LOG_SIZE = 1 * 1024 * 1024; // 1 MB
const LOG_FILE = 'voice-to-text.log';
const LOG_FILE_BACKUP = 'voice-to-text.log.bak';

function rotateLogs(pluginPath: string) {
	const logFilePath = `${pluginPath}/${LOG_FILE}`;
	const backupFilePath = `${pluginPath}/${LOG_FILE_BACKUP}`;

	try {
		if (existsSync(logFilePath)) {
			const stats = statSync(logFilePath);

			if (stats.size >= MAX_LOG_SIZE) {
				renameSync(logFilePath, backupFilePath);
			}
		}
	} catch (error) {
		console.error(`Failed to rotate logs: ${error}`);
	}
}

export async function logger(pluginPath: string, options: string | LoggerOptions) {
	const timestamp = new Date().toISOString();
	let level: string;
	let message: string;

	if (typeof options === 'string') {
		level = 'info';
		message = options;
	} else {
		level = options.level;
		message = options.message;
	}

	const logString = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
	const logFilePath = `${pluginPath}/${LOG_FILE}`;

	try {
		rotateLogs(pluginPath);

		await appendFileAsync(logFilePath, logString, 'utf8');
	} catch (error) {
		console.error(`Failed to write to log file: ${error}`);
	}

	switch (level) {
		case 'info':
			console.log(logString);
			break;
		case 'warn':
			console.warn(logString);
			break;
		case 'error':
			console.error(logString);
			break;
	}
}

export const logInfo = (pluginPath: string, message: string) => {
	if (!isProd) {
		logger(pluginPath, { level: 'info', message });
	}
};
export const logWarn = (pluginPath: string, message: string) => {
	if (!isProd) {
		logger(pluginPath, { level: 'warn', message });
	}
}
export const logError = (pluginPath: string, message: string) => logger(pluginPath, { level: 'error', message });
