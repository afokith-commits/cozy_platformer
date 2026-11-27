@echo off
title Sproutbound — Cozy Micro-Platformer
echo ===================================
echo     Starting Sproutbound...
echo ===================================
python -m pip install -q pygame
python main.py
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo An error occurred. Press any key to exit.
    pause >nul
)
