param([string]$JdkBin = "")
$ErrorActionPreference = "Stop"
$taskRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if (-not $JdkBin) {
    $taskCandidates = @()
    if ($env:JAVA_HOME) { $taskCandidates += (Join-Path $env:JAVA_HOME "bin") }
    $taskJavaFolder = Join-Path $env:ProgramFiles "Java"
    if (Test-Path -LiteralPath $taskJavaFolder) { $taskCandidates += (Get-ChildItem -LiteralPath $taskJavaFolder -Directory | Sort-Object Name -Descending | ForEach-Object { Join-Path $_.FullName "bin" }) }
    $JdkBin = $taskCandidates | Where-Object { Test-Path -LiteralPath (Join-Path $_ "javac.exe") } | Select-Object -First 1
}
if (-not $JdkBin) { throw "Set JAVA_HOME to JDK 17+, or pass -JdkBin." }
$taskNative = Join-Path $taskRoot "安卓插件/GuyuGuard-源码与构建"
$taskOutput = Join-Path $taskRoot ("_tmp/guard-release-" + [guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $taskOutput | Out-Null
$taskSources = Get-ChildItem (Join-Path $taskNative "src"),(Join-Path $taskNative "stubs") -Recurse -Filter *.java | ForEach-Object FullName
& (Join-Path $JdkBin "javac.exe") --release 8 -encoding UTF-8 -implicit:none -nowarn -d $taskOutput @taskSources
if ($LASTEXITCODE -ne 0) { throw "Native compilation failed" }
$taskJar = Join-Path $taskOutput "classes.jar"
& (Join-Path $JdkBin "jar.exe") cf $taskJar -C $taskOutput com
if ($LASTEXITCODE -ne 0) { throw "Native jar creation failed" }
& python (Join-Path $taskRoot "tools/package_guard.py") $taskJar
if ($LASTEXITCODE -ne 0) { throw "AAR packaging failed" }
