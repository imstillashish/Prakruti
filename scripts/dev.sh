#!/usr/bin/env bash
set -e

echo "→ Installing Python deps..."
pip install -r requirements.txt -q

echo "→ Starting API on http://localhost:5000 ..."
python app.py &
API_PID=$!

echo "→ Installing frontend deps..."
cd frontend
npm install --silent

echo "→ Starting dashboard on http://localhost:3000 ..."
npm run dev &
FRONTEND_PID=$!

trap "kill $API_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
