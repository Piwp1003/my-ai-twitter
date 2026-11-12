# 谷雨：上传的时候顺便出一个新的安卓安装包（上传到GitHub.bat 会叫它）
# 原理：GitHub 上的「打包 APK」（.github/workflows/apk.yml）只在 android-build 文件夹有改动时自己跑。
#      这里把 android-build/www-manifest.json 的版本号 +1，推上去以后它就自己开始打包。
param([switch]$Done)
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)
$mf = 'android-build\www-manifest.json'
$flag = '_tmp\apk-bumped.txt'
$rel = 'https://github.com/Piwp1003/my-ai-twitter/releases/tag/apk'
$act = 'https://github.com/Piwp1003/my-ai-twitter/actions/workflows/apk.yml'
New-Item -ItemType Directory -Force '_tmp' | Out-Null

if ($Done) {
  if (-not (Test-Path $flag)) { exit 0 }
  $v = Get-Content $flag -Raw -Encoding UTF8
  Remove-Item $flag -Force -ErrorAction SilentlyContinue
  Write-Host ''
  Write-Host '=========== 安卓安装包 ===========' -ForegroundColor Cyan
  Write-Host ("  GitHub 已经开始打 " + $v.Trim() + " 的安装包了，大概 10 到 20 分钟。")
  Write-Host '  看进度（黄色转圈 = 在打，绿勾 = 好了，红叉 = 失败，点进去看原因）：'
  Write-Host ("    " + $act)
  Write-Host '  打好以后在这里下载 guyu-版本号.apk，再传到 QQ 群文件：'
  Write-Host ("    " + $rel)
  Write-Host '=================================='
  exit 0
}

$text = [IO.File]::ReadAllText((Resolve-Path $mf).Path, [Text.Encoding]::UTF8)
$m = [regex]::Match($text, '"code":\s*(\d+)')
if (-not $m.Success) { Write-Host '  读不到安装包的版本号，跳过。' ; exit 0 }
$code = [int]$m.Groups[1].Value
$nameNow = '{0:0.00}' -f ($code / 100)

# 这次已经改过版本号（还没上传）：推上去就会打这一版，不用再加
git diff --quiet HEAD -- $mf 2>$null
if ($LASTEXITCODE -eq 1) {
  Write-Host ("  这次上传本来就会打新的安装包 " + $nameNow + "，不用再加。") -ForegroundColor Yellow
  Set-Content $flag $nameNow -Encoding UTF8
  exit 0
}

Write-Host ''
Write-Host '  要不要顺便出一个新的安卓安装包？' -ForegroundColor Cyan
Write-Host ("  现在的安装包是 " + $nameNow + "。大部分更新不用出新安装包：手机上「检查更新」就能拿到。")
Write-Host '  只有改了安卓那边的东西（谷雨守护、权限、后台这类）才需要。拿不准就选 N。'
$a = Read-Host '  出新安装包请输入 Y 回车；不出直接回车'
if ($a -notmatch '^[Yy]') { Write-Host '  不出，只上传。'; exit 0 }

$new = $code + 1
$newName = '{0:0.00}' -f ($new / 100)
$text = [regex]::Replace($text, '"code":\s*\d+', '"code": ' + $new)
$text = [regex]::Replace($text, '"name":\s*"\d+\.\d+"', '"name": "' + $newName + '"')
[IO.File]::WriteAllText((Resolve-Path $mf).Path, $text, (New-Object Text.UTF8Encoding $false))
Set-Content $flag $newName -Encoding UTF8
Write-Host ("  好，安装包版本改成 " + $newName + "，上传完 GitHub 会自己开始打包。") -ForegroundColor Green
