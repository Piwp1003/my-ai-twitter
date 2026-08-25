@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"

echo ==========================================
echo   Upload Guyu to GitHub
echo   repo: github.com/Piwp1003/my-ai-twitter
echo   branch: main
echo ==========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [X] git not found on this PC.
  echo     Install Git for Windows first, then run this again:
  echo     https://git-scm.com/download/win
  echo.
  pause
  exit /b 1
)

echo [1/5] Clearing stale lock file ...
if exist ".git\index.lock" (
  del /f /q ".git\index.lock"
  echo       removed .git\index.lock
) else (
  echo       none found
)
echo.

echo [2/5] Staging files ...
git add -A
if errorlevel 1 goto ADDFAIL
echo       staged
echo.

echo [3/5] Checking for oversized files ^(limit 50 MB^) ...
set BIG=0
for /f "usebackq delims=" %%F in (`git -c core.quotepath^=false diff --cached --name-only`) do (
  if exist "%%F" (
    if %%~zF GTR 52428800 (
      echo       TOO BIG: %%F
      set BIG=1
    )
  )
)
if "!BIG!"=="1" (
  echo.
  echo [X] Some staged files are too large for GitHub.
  echo     Add them to .gitignore, then run:  git reset
  echo     then run this bat again.
  echo.
  pause
  exit /b 1
)
echo       ok, nothing oversized
echo.

echo [4/5] Commit ...
git commit -m "Guyu: modular js 01-17, tavern helper bridge, story studio, live feed NPCs, desktop build"
if errorlevel 1 echo       nothing new to commit - continuing
echo.

echo [5/5] Push to origin/main ...
echo       ^(a GitHub login window may pop up - that is normal^)
git push -u origin main
if errorlevel 1 goto PUSHFAIL

echo.
echo ==========================================
echo   DONE. Check it here:
echo   https://github.com/Piwp1003/my-ai-twitter
echo ==========================================
echo.
pause
exit /b 0


:PUSHFAIL
echo.
echo [X] Push failed. Read the git message above, then:
echo.
echo   * "rejected" / "non-fast-forward"
echo     The remote has commits you do not have locally.
echo     Run these two lines in this folder, then rerun this bat:
echo         git pull --rebase origin main
echo         git push -u origin main
echo.
echo   * asks for username / password
echo     GitHub no longer accepts account passwords.
echo     Username = your GitHub name, Password = a Personal Access
echo     Token created here (tick the "repo" scope):
echo         https://github.com/settings/tokens
echo.
echo   * "could not read Username" / "terminal prompts disabled"
echo     Install Git Credential Manager (comes with Git for Windows)
echo     or run:  git config --global credential.helper manager
echo.
pause
exit /b 1


:ADDFAIL
echo.
echo [X] "git add" failed. Read the message above.
echo     If it mentions "index.lock", close any open Git GUI /
echo     VS Code / SourceTree and run this bat again.
echo.
pause
exit /b 1
