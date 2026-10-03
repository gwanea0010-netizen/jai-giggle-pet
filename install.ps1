# Giggles Pet one-line installer. Developed by Jai Panwar.
#   irm https://raw.githubusercontent.com/gwanea0010-netizen/jai-giggle-pet/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$url = 'https://github.com/gwanea0010-netizen/jai-giggle-pet/releases/latest/download/Giggles-Pet-Setup.exe'
$out = Join-Path $env:TEMP 'Giggles-Pet-Setup.exe'

Write-Host ''
Write-Host '  Giggles Pet - Cyborg ERP dev buddy' -ForegroundColor Cyan
Write-Host '  Downloading the latest version...'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$ProgressPreference = 'SilentlyContinue'
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing

Write-Host '  Installing...'
Start-Process -FilePath $out -ArgumentList '/S', '--force-run' -Wait
Write-Host '  Done! Your pet is on the desktop. Right-click it -> Settings to enter your name.' -ForegroundColor Green
Write-Host ''
