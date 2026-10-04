@echo off
title Reader App Server [Initializing]
cd /d "%~dp0"
call npm run prod
exit /b %errorlevel%
