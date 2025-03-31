# Voice to Text Plugin for Obsidian

This plugin allows you to record audio and transcribe it into text, appending it to the end of your Obsidian notes.

## Features
- Record audio with a button in the editor.
- Transcribe audio using Vosk.
- Append text to the end of the note with a newline.

## Manual installation

1. Download the latest release from the [Releases page](https://github.com/DanilChugaev/voice-to-text-obsidian-plugin/releases).
2. Copy `main.js`, `manifest.json`, and `styles.css` into `VaultFolder/.obsidian/plugins/voice-to-text/`.
3. Install dependencies: 
   - See [Install Dependencies](Dependencies.md) for detailed instructions on setting up the required tools.
4. Enable the plugin in Obsidian: `Settings > Community Plugins > Enable Voice to Text`.

## Usage
- Open a note in Source Mode.
- Click the 🎙️ button to start recording.
- Wait for transcription to complete.

## Development
- Clone the repo: `git clone https://github.com/DanilChugaev/voice-to-text-obsidian-plugin`
- Install dependencies: `yarn`
- Build: `yarn build`
