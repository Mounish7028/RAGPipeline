@echo off
echo ============================================
echo   NVIDIA RAG Chatbot - Setup Script
echo ============================================

echo [1/4] Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo [ERROR] Failed to create venv. Is Python 3.10+ installed?
    pause
    exit /b 1
)

echo [2/4] Activating venv and upgrading pip...
call venv\Scripts\activate.bat
python -m pip install --upgrade pip --quiet

echo [3/4] Installing core packages (Flask, ChromaDB, Gemini)...
pip install flask flask-cors pymupdf chromadb google-genai==0.8.0 werkzeug --quiet

echo [4/4] Installing ML packages (sentence-transformers + PyTorch CPU)...
echo [INFO] This may take a few minutes - downloading ~1.3GB BGE model on first run...
pip install sentence-transformers==3.0.1 torch==2.3.1 transformers==4.43.3 numpy==1.26.4 --quiet

echo.
echo ============================================
echo   Setup Complete!
echo   Run start.bat to launch the application.
echo ============================================
pause
