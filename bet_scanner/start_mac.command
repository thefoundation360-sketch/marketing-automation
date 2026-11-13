#!/bin/bash
# Double-click (or run `bash start_mac.command`) to set up on first run, then scan every 3 hours.
cd "$(dirname "$0")" || exit 1
if [ ! -d .venv ]; then
  echo "First run: installing (one minute)..."
  python3 -m venv .venv || { echo "Install Python from https://www.python.org/downloads/ and try again."; read -r; exit 1; }
fi
source .venv/bin/activate
pip install -q -r requirements.txt
if [ ! -f config.json ]; then python setup.py || { read -r; exit 1; }; fi
python scanner.py --every 180
