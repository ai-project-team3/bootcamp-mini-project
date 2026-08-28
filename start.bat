@echo off
REM 백엔드와 프론트엔드를 동시에 띄운다.
REM 두 서버 모두 0.0.0.0 에 바인딩하므로, 같은 와이파이에 있는 다른 사람의
REM 휴대폰에서도 http://<이 PC의 IP>:5173 으로 접속해 함께 플레이할 수 있다.
cd /d "%~dp0"
start "Minigames Backend" cmd /k ".venv\Scripts\activate.bat && cd backend && uvicorn app.standalone:app --host 0.0.0.0 --port 8000"
start "Minigames Frontend" cmd /k "cd frontend && npm run dev -- --host 0.0.0.0 --port 5173"
timeout /t 3 /nobreak >nul
start http://localhost:5173
