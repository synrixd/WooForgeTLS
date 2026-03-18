@echo off
cd /d %~dp0
cd ..

if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

pyinstaller ^
    --noconfirm ^
    --windowed ^
    --name WooForgeTLS ^
    --icon "assets\wooforgetls.ico" ^
    --add-data "templates;templates" ^
    --add-data "static;static" ^
    --collect-all webview ^
    desktop.py

pause

