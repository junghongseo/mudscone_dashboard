@echo off
echo Starting VAT Backend API Server on http://127.0.0.1:8005 ...
cd /d %~dp0backend
python -m uvicorn main:app --host 127.0.0.1 --port 8005 --reload
pause
