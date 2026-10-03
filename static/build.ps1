# build.ps1 — build.sh 의 Windows(PowerShell) 판입니다.
#
#   .\build.ps1                               invitation.conf → dist\
#   .\build.ps1 -Conf 다른파일.conf -Out 출력폴더
#   .\build.ps1 -Set "GUESTBOOK_API_BASE=/api"
#
# 실행이 막히면 한 번만:  Set-ExecutionPolicy -Scope Process Bypass
# (Git Bash 가 있다면 `sh build.sh` 를 써도 됩니다.)
param(
  [string]$Conf = "",
  [string]$Out = "",
  [string[]]$Set = @()
)
$ErrorActionPreference = "Stop"
$Here = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $Conf) { $Conf = Join-Path $Here "invitation.conf" }
if (-not $Out)  { $Out  = Join-Path $Here "dist" }
$Src = Join-Path $Here "src"
$Utf8 = New-Object System.Text.UTF8Encoding($false)

if (-not (Test-Path $Conf)) {
  Write-Error "설정 파일이 없습니다: $Conf`n  Copy-Item invitation.conf.example invitation.conf  로 만든 뒤 값을 채워 주세요."
}

# 1) conf 읽기: KEY="value"
$V = [ordered]@{}
foreach ($line in [System.IO.File]::ReadAllLines($Conf, $Utf8)) {
  if ($line -match '^\s*$' -or $line -match '^\s*#') { continue }
  if ($line -match '^([A-Z][A-Z0-9_]*)=(.*)$') {
    $val = $Matches[2].TrimEnd("`r")
    if ($val.StartsWith('"')) { $val = $val.Substring(1) }
    if ($val.EndsWith('"'))   { $val = $val.Substring(0, $val.Length - 1) }
    $V[$Matches[1]] = $val
  }
}
foreach ($kv in $Set) { $i = $kv.IndexOf("="); if ($i -gt 0) { $V[$kv.Substring(0, $i)] = $kv.Substring($i + 1) } }

function Get-V($k) { if ($V.Contains($k)) { $V[$k] } else { "" } }
function HtmlEsc($s) { $s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;") }
function JsonEsc($s) { $s.Replace("\", "\\").Replace('"', '\"').Replace("`t", "\t") }

# 2) 파생 값
$PhotoOg = Get-V "PHOTO_OG"; if (-not $PhotoOg) { $PhotoOg = Get-V "PHOTO_COVER" }
$V["PHOTO_OG"] = $PhotoOg
$Origin = (Get-V "SITE_ORIGIN").TrimEnd("/")
$OgTag = ""
if ($Origin -and $PhotoOg) { $OgTag = '<meta property="og:image" content="' + (HtmlEsc "$Origin/photos/$PhotoOg") + '">' }

# 3) 복사
if (-not (Test-Path $Src)) { Write-Error "src\ 폴더를 찾을 수 없습니다: $Src" }
if (Test-Path $Out) { Remove-Item -Recurse -Force $Out }
New-Item -ItemType Directory -Force -Path $Out | Out-Null
Copy-Item -Recurse -Force (Join-Path $Src "*") $Out
Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $Out "photos\.gitkeep")
# DEFAULT_VERSION(main 또는 developer)의 사본이 index.html 이 됩니다.
$Def = Get-V "DEFAULT_VERSION"
if ($Def -ne "main" -and $Def -ne "developer") {
  if ($Def) { Write-Warning "DEFAULT_VERSION='$Def' 은 main 또는 developer 여야 합니다. main 으로 둡니다." }
  $Def = "main"
}
Copy-Item -Force (Join-Path $Out "$Def.html") (Join-Path $Out "index.html")

# 4) {{TOKEN}} 치환
foreach ($html in Get-ChildItem -Path $Out -Filter *.html) {
  $t = [System.IO.File]::ReadAllText($html.FullName, $Utf8)
  foreach ($k in $V.Keys) {
    if ($k -like "*_ACCOUNTS") { continue }
    $t = $t.Replace("{{$k}}", (HtmlEsc $V[$k]))
  }
  $t = $t.Replace("{{OG_IMAGE_TAG}}", $OgTag)
  [System.IO.File]::WriteAllText($html.FullName, $t, $Utf8)
  $left = [regex]::Matches($t, '\{\{[A-Z_]+\}\}') | ForEach-Object { $_.Value } | Sort-Object -Unique
  if ($left) { Write-Warning ("{0} 에 치환되지 않은 토큰이 있습니다: {1}" -f $html.Name, ($left -join ", ")) }
}

# 5) dist\js\data.js
$JsDir = Join-Path $Out "js"; New-Item -ItemType Directory -Force -Path $JsDir | Out-Null
$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine("// build.ps1 이 invitation.conf 에서 만든 파일입니다. 직접 고치지 마세요.")
[void]$sb.AppendLine("window.__WEDDING__ = {")
$items = @()
foreach ($k in ($V.Keys | Sort-Object)) {
  if ($k -like "*_ACCOUNTS") { continue }
  $items += ('  "{0}": "{1}"' -f $k, (JsonEsc $V[$k]))
}
[void]$sb.AppendLine(($items -join ",`n"))
[void]$sb.AppendLine("};")
# 계좌: base64 → 문자열 뒤집기 (build.sh 와 같은 방식)
$plain = "G:" + (Get-V "GROOM_ACCOUNTS") + "`nB:" + (Get-V "BRIDE_ACCOUNTS") + "`n"
$b64 = [Convert]::ToBase64String($Utf8.GetBytes($plain))
$chars = $b64.ToCharArray(); [Array]::Reverse($chars)
[void]$sb.AppendLine('window.__GIFT__ = "' + (-join $chars) + '";')
[System.IO.File]::WriteAllText((Join-Path $JsDir "data.js"), $sb.ToString(), $Utf8)

Write-Host "완료: $Out"
Write-Host "  미리보기: .\startup.ps1"
