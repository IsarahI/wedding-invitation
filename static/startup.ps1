# startup.ps1 — dist\ 를 내 컴퓨터에서 미리 봅니다.   .\startup.ps1 [포트]
param([int]$Port = 8080)
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
$Dist = Join-Path $Here "dist"
if (-not (Test-Path (Join-Path $Dist "index.html"))) { Write-Error "dist\ 가 없습니다. 먼저 .\build.ps1 를 실행하세요." }
Set-Location $Dist
Write-Host "미리보기: http://localhost:$Port   (끄려면 Ctrl+C)"
if (Get-Command py -ErrorAction SilentlyContinue)      { py -3 -m http.server $Port }
elseif (Get-Command python -ErrorAction SilentlyContinue) { python -m http.server $Port }
elseif (Get-Command npx -ErrorAction SilentlyContinue)    { npx --yes serve -l $Port . }
else { Write-Error "python 또는 node(npx)가 필요합니다." }
