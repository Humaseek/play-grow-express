@echo off
set msg=%*
if "%msg%"=="" set msg=update
git add -A
git commit -m "%msg%"
git push
