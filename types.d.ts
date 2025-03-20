import 'obsidian';

declare module 'obsidian' {
	interface Plugin {
		registerCodeMirror(callback: (cm: CodeMirror.Editor) => void): void;
	}
}
