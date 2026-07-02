@echo off
echo ===============
echo  Smart Learning Advisor - EIU
echo ===============
echo.

REM --- Check Node.js ---
node --version >nul 2>&1
if errorlevel 1 (
    echo Loi: Node.js chua duoc cai dat!
    echo Tai va cai dat tu: https://nodejs.org/
    pause
    exit /b 1
)

REM --- [1/3] Backend dependencies ---
if not exist "node_modules" (
    echo [1/3] Dang cai dependencies backend...
    call npm install
    if errorlevel 1 (
        echo Loi khi cai dependencies backend!
        pause
        exit /b 1
    )
) else (
    echo [1/3] Backend dependencies OK
)

REM --- [2/3] Build giao dien React ---
echo [2/3] Dang build giao dien React (client)...
pushd client
if not exist "node_modules" (
    call npm install
    if errorlevel 1 (
        echo Loi khi cai dependencies client!
        popd
        pause
        exit /b 1
    )
)
call npm run build
if errorlevel 1 (
    echo Loi khi build client!
    popd
    pause
    exit /b 1
)
popd

REM --- [3/3] Khoi dong server ---
echo.
echo [3/3] Khoi dong Smart Learning Advisor...
echo Ung dung se chay tai: http://localhost:3010
echo Nhan Ctrl+C de dung ung dung.
echo.

node app.js

echo.
echo Ung dung da dung!
pause