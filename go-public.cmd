@echo off
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\go-public.ps1" -OpenBrowser %*
