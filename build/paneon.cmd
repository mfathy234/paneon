@echo off
setlocal
set "ELECTRON_RUN_AS_NODE=1"
"%~dp0Paneon.exe" "%~dp0resources\paneon-cli.cjs" %*
endlocal & exit /b %ERRORLEVEL%
