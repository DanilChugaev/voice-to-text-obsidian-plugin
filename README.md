# Voice to Text Plugin for [Obsidian](https://obsidian.md)

This plugin allows you to record audio and transcribe it into text, appending it to the end of your Obsidian notes.

## Features
- Record audio with a button in the editor.
- Transcribe audio using Vosk.
- Append text to the end of the note with a newline.

## Manual installation

1. Download the latest release from the [Releases page](https://github.com/DanilChugaev/voice-to-text-obsidian-plugin/releases).
2. Copy `main.js`, `manifest.json`, and `styles.css` into `VaultFolder/.obsidian/plugins/voice-to-text/`.
3. Install dependencies:
   - Python 3.x
   - Vosk
   - FFmpeg
   - Vosk Model
   - See [Install Dependencies](https://github.com/DanilChugaev/voice-to-text-obsidian-plugin/blob/master/Dependencies.md) for detailed instructions on setting up the required tools.
4. Enable the plugin in Obsidian: `Settings > Community Plugins > Enable Voice to Text`.

## Install Dependencies using Installation Scripts

Download the appropriate script from the `scripts/` folder in the repository and run it:

### Ubuntu/Debian:

```bash
chmod +x scripts/install-dependencies-linux.sh
./scripts/install-dependencies-linux.sh
```

### macOS:

```bash
chmod +x scripts/install-dependencies-macos.sh
./scripts/install-dependencies-macos.sh
```

### Windows:

- Right-click scripts/install-dependencies-windows.bat and select "Run as administrator".

## Usage
- Open a note in Source Mode.
- Click the 🎙️ button to start recording.
- Wait for transcription to complete.

## Development
- Clone the repo: `git clone https://github.com/DanilChugaev/voice-to-text-obsidian-plugin`
- Install dependencies: `yarn`
- Build: `yarn build`
