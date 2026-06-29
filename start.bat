@echo off
echo ====================================
echo  Smart Learning Advisor - EIU
echo ====================================
echo.
echo Dang khoi dong ung dung...
echo.

REM Check if node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Loi: Node.js chua duoc cai dat!
    echo Vui long tai va cai dat Node.js tu: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Dang cai dat dependencies...
    npm install
    if errorlevel 1 (
        echo Loi khi cai dat dependencies!
        pause
        exit /b 1
    )
)

echo Khoi dong Smart Learning Advisor...
echo.
echo Ung dung se chay tai: http://localhost:3000
echo Nhan Ctrl+C de dung ung dung
echo.

node app.js

echo.
echo Ung dung da dung!
pause
