#!/bin/bash

# Script to install dependencies for the Voice to Text Obsidian plugin on Ubuntu/Debian

echo "Starting dependency installation for Voice to Text plugin..."

# Update package list
echo "Updating package list..."
sudo apt update

# Install Python 3 and pip
echo "Installing Python 3 and pip..."
sudo apt install -y python3 python3-pip

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
sudo apt install -y ffmpeg

# Verify FFmpeg installation
if ffmpeg -version > /dev/null 2>&1; then
    echo "FFmpeg installed successfully: $(ffmpeg -version | head -n 1)"
else
    echo "Failed to install FFmpeg!" >&2
    exit 1
fi

echo "All dependencies installed successfully!"
echo "Next step: Download a Vosk model from https://alphacephei.com/vosk/models and place it in your Obsidian vault."
