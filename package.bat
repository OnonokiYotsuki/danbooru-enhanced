@echo off
title Danbooru Enhanced Packager
echo Packaging... please wait.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -Command "$m=Get-Content 'manifest.json'|ConvertFrom-Json; $v=$m.version; $z=\"danbooru-enhanced-v$v.zip\"; $d='dist'; if(!(Test-Path $d)){New-Item -ItemType Directory -Path $d}; $o=Join-Path $d $z; if(Test-Path $o){Remove-Item $o}; $i=@('manifest.json','content.js','content.css','_locales','LICENSE'); Compress-Archive -Path $i -DestinationPath $o -Force; Write-Host 'Done! File saved in: ' $o -ForegroundColor Green"

echo.
pause
