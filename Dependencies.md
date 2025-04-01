# Install Dependencies

To use the Voice to Text plugin, you need to install some dependencies on your system. Follow the steps below based on your operating system. These tools are required for recording and transcribing audio. Click on the operating system name to expand the instructions.

## Python 3.x

The plugin uses Python to run the Vosk transcription script. You need Python 3.7 or higher installed.

<details>
<summary>Ubuntu/Debian</summary>

1. Open a terminal (press `Ctrl+Alt+T`).
2. Update the package list:
   ```bash
   sudo apt update
   ```
3. Install Python 3 and pip:
   ```bash
   sudo apt install python3 python3-pip
   ```
4. Verify the installation:
   ```bash
   python3 --version
   ```
   You should see something like `Python 3.x.x`. If it works, Python is ready!

</details>

<details>
<summary>macOS</summary>

1. Open the Terminal (find it in `Applications > Utilities > Terminal`).
2. Install Homebrew (a package manager for macOS) if you don’t have it:
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Install Python 3:
   ```bash
   brew install python
   ```
4. Verify the installation:
   ```bash
   python3 --version
   ```
   You should see `Python 3.x.x`. Python is now installed!

</details>

<details>
<summary>Windows</summary>

1. Download the Python installer from [python.org](https://www.python.org/downloads/).
	- Choose the latest version (e.g., Python 3.11.x).
2. Run the installer:
	- Check the box **"Add Python to PATH"** at the bottom of the installer window.
	- Click **"Install Now"**.
3. Open Command Prompt (press `Win + R`, type `cmd`, and press Enter).
4. Verify the installation:
   ```cmd
   python --version
   ```
   If you see `Python 3.x.x`, Python is installed correctly. If it says `'python' is not recognized`, reopen Command Prompt or restart your computer.

</details>

---

## Vosk

Vosk is an open-source speech recognition toolkit used by the plugin to transcribe audio. You’ll need to install it via Python’s package manager, `pip`.

<details>
<summary>Ubuntu/Debian</summary>

1. Open a terminal (press `Ctrl+Alt+T`).
2. Ensure `pip` is installed and updated:
   ```bash
   python3 -m ensurepip --upgrade
   python3 -m pip install --upgrade pip
   ```
3. Install Vosk:
   ```bash
   python3 -m pip install vosk
   ```
4. Verify the installation:
   ```bash
   python3 -c "import vosk; print(vosk.__version__)"
   ```
   If it prints a version number (e.g., `0.3.45`), Vosk is installed!

</details>

<details>
<summary>macOS</summary>

1. Open the Terminal.
2. Ensure `pip` is up to date:
   ```bash
   python3 -m ensurepip --upgrade
   python3 -m pip install --upgrade pip
   ```
3. Install Vosk:
   ```bash
   python3 -m pip install vosk
   ```
4. Verify the installation:
   ```bash
   python3 -c "import vosk; print(vosk.__version__)"
   ```
   If you see a version number, Vosk is ready to use.

</details>

<details>
<summary>Windows</summary>

1. Open Command Prompt (press `Win + R`, type `cmd`, and press Enter).
2. Ensure `pip` is installed and updated:
   ```cmd
   python -m ensurepip --upgrade
   python -m pip install --upgrade pip
   ```
3. Install Vosk:
   ```cmd
   python -m pip install vosk
   ```
4. Verify the installation:
   ```cmd
   python -c "import vosk; print(vosk.__version__)"
   ```
   If Command Prompt shows a version (e.g., `0.3.45`), Vosk is successfully installed.

</details>

---

## FFmpeg

FFmpeg is a tool used to convert recorded audio into a format Vosk can process. Here’s how to install it on each system.

<details>
<summary>Ubuntu/Debian</summary>

1. Open a terminal (press `Ctrl+Alt+T`).
2. Install FFmpeg:
   ```bash
   sudo apt update
   sudo apt install ffmpeg
   ```
3. Verify the installation:
   ```bash
   ffmpeg -version
   ```
   If you see version information (e.g., `ffmpeg version 4.x.x`), FFmpeg is installed.

</details>

<details>
<summary>macOS</summary>

1. Open the Terminal.
2. Install Homebrew if you haven’t already (see Python section for macOS):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
3. Install FFmpeg:
   ```bash
   brew install ffmpeg
   ```
4. Verify the installation:
   ```bash
   ffmpeg -version
   ```
   If Terminal shows a version (e.g., `ffmpeg version 6.x.x`), FFmpeg is ready.

</details>

<details>
<summary>Windows</summary>

1. Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html):
	- Recommended: Use the build from [gyan.dev](https://www.gyan.dev/ffmpeg/builds/). Download `ffmpeg-release-essentials.zip`.
2. Extract the ZIP file:
	- For example, extract to `C:\ffmpeg`.
3. Add FFmpeg to PATH:
	- Right-click "This PC" > "Properties" > "Advanced system settings" > "Environment Variables".
	- In "System variables", find `Path`, click "Edit…", then "New", and add `C:\ffmpeg\bin` (or the path to the `bin` folder from your extraction).
	- Click "OK" to save changes.
4. Open a new Command Prompt (close the old one to refresh PATH).
5. Verify the installation:
   ```cmd
   ffmpeg -version
   ```
   If you see version info (e.g., `ffmpeg version 6.x.x`), FFmpeg is installed and ready.

</details>

---

## Vosk Model

The plugin requires a Vosk model for speech recognition. Here’s how to download and set it up.

<details>
<summary>All Systems (Ubuntu/Debian, macOS, Windows)</summary>

1. Visit [Vosk Models](https://alphacephei.com/vosk/models) and download a model:
	- For Russian, use `vosk-model-small-ru-0.22` (~50 MB).
	- For English, use `vosk-model-small-en-us-0.15`.
2. Extract the ZIP file:
	- You’ll get a folder like `vosk-model-small-ru-0.22`.
3. Move the contents of the folder to your Obsidian vault:
	- Place it in `VaultFolder/.obsidian/plugins/voice-to-text/vosk-model`.
4. Ensure the plugin can find it:
	- The default path in the plugin assumes the model is in the vault root. If you place it elsewhere, update the `modelPath` variable in `main.ts` to the full path (e.g., `C:\\path\\to\\vosk-model`).

</details>
