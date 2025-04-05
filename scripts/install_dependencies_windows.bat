@echo off
REM Batch script to install dependencies for the Voice to Text Obsidian plugin on Windows

echo Starting dependency installation for Voice to Text plugin...

REM Check if Python is installed
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Python not found, downloading and installing...
    REM Download Python installer (using PowerShell for simplicity)
    powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.11.9/python-3.11.9-amd64.exe' -OutFile 'python-installer.exe'"
    REM Install Python silently, adding it to PATH
    python-installer.exe /quiet InstallAllUsers=1 PrependPath=1
    REM Clean up
    del python-installer.exe
) else (
    echo Python already installed:
    python --version
)

REM Wait a moment for PATH to update (may require restart in some cases)
timeout /t 5

REM Verify Python
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install Python! Please install manually from python.org.
    exit /b 1
) else (
    echo Python installed successfully.
)

REM Update pip and install Vosk
echo Installing Vosk via pip...
python -m pip install --upgrade pip
python -m pip install vosk

REM Verify Vosk installation
python -c "import vosk; print(vosk.__version__)" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install Vosk!
    exit /b 1
) else (
    echo Vosk installed successfully:
    python -c "import vosk; print(vosk.__version__)"
)

REM Download and install FFmpeg
echo Installing FFmpeg...
if not exist "C:\ffmpeg" (
    REM Download FFmpeg using PowerShell
    powershell -Command "Invoke-WebRequest -Uri 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip' -OutFile 'ffmpeg.zip'"
    REM Extract FFmpeg
    powershell -Command "Expand-Archive -Path 'ffmpeg.zip' -DestinationPath 'C:\ffmpeg_temp'"
    REM Move ffmpeg.exe and dependencies to C:\ffmpeg
    mkdir C:\ffmpeg
    move C:\ffmpeg_temp\ffmpeg-master-latest-win64-gpl\bin\* C:\ffmpeg\
    REM Clean up
    rmdir /s /q C:\ffmpeg_temp
    del ffmpeg.zip
)

REM Add FFmpeg to PATH (persistent)
echo Adding FFmpeg to PATH...
setx PATH "%PATH%;C:\ffmpeg" /M

REM Verify FFmpeg installation
ffmpeg -version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo Failed to install FFmpeg! Please install manually from ffmpeg.org.
    exit /b 1
) else (
    echo FFmpeg installed successfully:
    ffmpeg -version
)

echo All dependencies installed successfully!
echo Next step: Download a Vosk model from https://alphacephei.com/vosk/models and place it in your Obsidian vault.
pause
