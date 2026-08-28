@echo off
setlocal
title Где мои деньги
cd /d "%~dp0"


rem Добавляем Node.js в PATH, если он не найден
where npm >nul 2>&1
if errorlevel 1 (
  if exist "C:\Program Files\nodejs\npm.cmd" set "PATH=%PATH%;C:\Program Files\nodejs"
)

if not exist node_modules (
  echo Устанавливаю зависимости...
  call npm install
)

echo Запускаю сервер...
start "where-is-my-money-server" cmd /c "npm start"

echo Ожидаю запуска сервера на http://localhost:3000 ...
set /a tries=0
:wait
timeout /t 1 /nobreak >nul
powershell -NoProfile -Command "try { (Invoke-WebRequest -UseBasicParsing http://localhost:3000 -TimeoutSec 2) | Out-Null; exit 0 } catch { exit 1 }" >nul 2>&1
set /a tries+=1
if %tries% geq 90 (
  echo Сервер не ответил за 90 секунд. Проверьте окно сервера.
  pause
  exit /b 1
)
if errorlevel 1 goto wait
echo Сервер запущен. Открываю браузер.
start "" http://localhost:3000
