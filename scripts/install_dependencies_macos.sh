#!/bin/bash

# Script to install dependencies for the Voice to Text Obsidian plugin on macOS

echo "Starting dependency installation for Voice to Text plugin..."

# Check if Homebrew is installed, install if not
if ! command -v brew > /dev/null 2>&1; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "Homebrew already installed, updating..."
    brew update
fi

# Install Python 3
echo "Installing Python 3..."
brew install python

# Verify Python installation
if python3 --version; then
    echo "Python installed successfully: $(python3 --version)"
else
    echo "Failed to install Python!" >&2
    exit 1
fi

# Update pip and install Vosk
echo "Installing Vosk via pip..."
python3 -m pip install --upgrade pip
python3 -m pip install vosk

# Verify Vosk installation
if python3 -c "import vosk; print(vosk.__version__)" > /dev/null 2>&1; then
    echo "Vosk installed successfully: $(python3 -c "import vosk; print(vosk.__version__)")"
else
    echo "Failed to install Vosk!" >&2
    exit 1
fi

# Install FFmpeg
echo "Installing FFmpeg..."
brew install ffmpeg

# Verify FFmpeg installation
if ffmpeg -version > /dev/null 2>&1; then
    echo "FFmpeg installed successfully: $(ffmpeg -version | head -n 1)"
else
    echo "Failed to install FFmpeg!" >&2
    exit 1
fi

echo "All dependencies installed successfully!"
echo "Next step: Download a Vosk model from https://alphacephei.com/vosk/models and place it in your Obsidian vault."
