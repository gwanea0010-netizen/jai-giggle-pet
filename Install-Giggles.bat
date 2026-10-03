@echo off
setlocal
title Giggles Pet - Setup
cd /d "%~dp0"
echo.
echo   Giggles Pet - Cyborg ERP dev buddy
echo   ----------------------------------
echo.

rem No Node.js? Use the bundled installer instead (it needs nothing else).
where node >nul 2>nul
if errorlevel 1 goto :nonode

for /f "tokens=1 delims=v." %%v in ('node -v') do set NODE_MAJOR=%%v
if %NODE_MAJOR% LSS 18 (
  echo   Your Node.js is too old ^(need 18 or newer^).
  goto :nonode
)

echo   [1/3] Installing ^(about 1 minute^)...
call npm install --no-fund --no-audit --loglevel=error
if errorlevel 1 (
  echo.
  echo   npm install failed. Check your internet connection / proxy and try again,
  echo   or use the Giggles-Pet-Setup exe instead.
  pause
  exit /b 1
)
if not exist "%~dp0node_modules\electron\dist\electron.exe" (
  echo   Electron did not download. Run this file again, or use the Giggles-Pet-Setup exe.
  pause
  exit /b 1
)

echo   [2/3] Connecting to Claude Code...
call node scripts\install-hooks.js

echo   [3/3] Starting your pet...
start "" "%~dp0node_modules\electron\dist\electron.exe" "%~dp0."

echo.
echo   Done! Your pet is on the desktop. Tell it your name in Settings (right-click the pet).
echo   Restart Claude Code once so it picks up the new hooks.
echo.
pause
exit /b 0

:nonode
for %%f in ("%~dp0Giggles-Pet-Setup*.exe") do (
  echo   Node.js not found - running the installer instead...
  start "" "%%~ff"
  exit /b 0
)
echo   Node.js 18+ is required for this zip version.
echo   Easiest fix: ask for Giggles-Pet-Setup.exe ^(needs nothing^), or install Node.js from https://nodejs.org
pause
exit /b 1
