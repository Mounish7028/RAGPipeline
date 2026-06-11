@echo off
echo ============================================
echo   NVIDIA RAG Chatbot - Startup Script
echo ============================================

REM Activate virtual environment
if not exist "venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Run setup.bat first.
    pause
    exit /b 1
)

call venv\Scripts\activate.bat

REM Set Gemini API key (override here if needed)
REM set GEMINI_API_KEY=your_real_key_here

echo [INFO] Starting Flask server...
echo [INFO] Open http://127.0.0.1:5000 in your browser
echo [INFO] Press CTRL+C to stop
echo.

python run.py
pause
