@echo off
setlocal

echo.
echo  csrss_scanner build script
echo  --------------------------

:: Try MSVC first (cl.exe)
where cl >nul 2>nul
if %errorlevel%==0 (
    echo  [*] Building with MSVC...
    cl /EHsc /std:c++17 /O2 /W3 csrss_scanner.cpp advapi32.lib /Fe:scanner.exe /nologo
    if %errorlevel%==0 (
        echo  [*] Build succeeded: scanner.exe
        goto :done
    )
    echo  [!] MSVC build failed.
)

:: Fallback to MinGW
where g++ >nul 2>nul
if %errorlevel%==0 (
    echo  [*] Building with MinGW...
    g++ -std=c++17 -O2 -municode -Wall csrss_scanner.cpp -o scanner.exe -ladvapi32
    if %errorlevel%==0 (
        echo  [*] Build succeeded: scanner.exe
        goto :done
    )
    echo  [!] MinGW build failed.
)

echo.
echo  [!] No compiler found. Install one of:
echo      - Visual Studio Build Tools (cl.exe)
echo        https://visualstudio.microsoft.com/downloads/
echo      - MinGW-w64 (g++.exe)
echo        https://www.mingw-w64.org/
echo.
echo  If using MSVC, run this from a "Developer Command Prompt".
exit /b 1

:done
echo.
echo  Usage: scanner.exe [options]
echo    -o ^<file^>          Output file (default: paths.txt)
echo    --no-exist-check   Skip file existence checking
echo    -h                 Show help
echo.
echo  NOTE: Must run scanner.exe as Administrator.
