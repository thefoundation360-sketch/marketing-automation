@echo off
REM Double-click to set up on first run, then scan every 3 hours.
cd /d "%~dp0"
if not exist .venv (
  echo First run: installing (one minute)...
  py -m venv .venv || (echo Install Python from https://www.python.org/downloads/ and tick "Add to PATH". & pause & exit /b 1)
)
call .venv\Scripts\activate.bat
pip install -q -r requirements.txt
if not exist config.json (
  python setup.py || (pause & exit /b 1)
)
python scanner.py --every 180
pause
