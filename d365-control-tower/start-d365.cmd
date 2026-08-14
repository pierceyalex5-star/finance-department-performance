@echo off
setlocal
cd /d %~dp0
echo Updating D365 Control Tower from GitHub...
git pull --ff-only
if errorlevel 1 echo WARNING: Git pull did not complete. Starting the current local version.
echo.
echo Starting IFAST D365 Transformation Control Tower...
node server.js
