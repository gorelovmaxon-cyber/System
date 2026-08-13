# Приёмка тикета: прогоняет тесты, сборку и проверяет артефакт своими глазами.
# Смысл в том, чтобы НЕ верить отчёту сабагента на слово.
#
# Пример:
#   .\accept-ticket.ps1 -Root 'd:\проект' -Artifact 'трекер.html'
#   .\accept-ticket.ps1 -Root . -TestCmd 'npm test' -BuildCmd 'npm run build' -Artifact 'dist\index.html'

param(
    [string]$Root     = '.',
    [string]$TestCmd  = 'node --test',      # на Node 24 под Windows НЕ добавляй 'test/' — MODULE_NOT_FOUND
    [string]$BuildCmd = 'node build.js',
    [string]$Artifact = ''                  # самодостаточный файл; пусто — проверка пропускается
)

$ErrorActionPreference = 'Continue'
Set-Location $Root

function Section($name) { Write-Output ''; Write-Output "=== $name" }

Section 'Тесты'
$testOut = Invoke-Expression $TestCmd 2>&1 | Out-String
$summary = $testOut -split "`n" | Select-String -Pattern '^\W*(tests|pass|fail)\s+\d+'
if ($summary) { $summary | ForEach-Object { $_.Line.Trim() } } else { $testOut -split "`n" | Select-Object -Last 15 }

$failed = $testOut -match 'fail\s+[1-9]'
if ($failed) { Write-Output 'ТЕСТЫ КРАСНЫЕ — тикет не принят' }

Section 'Сборка'
Invoke-Expression $BuildCmd 2>&1 | Select-Object -Last 5

if ($Artifact -and (Test-Path $Artifact)) {
    Section "Внешние ссылки в $Artifact (должно быть пусто)"
    $ext = Select-String -Path $Artifact -Pattern 'https?://|[@]import|src="//|fonts\.googleapis|cdn\.' -AllMatches
    if ($ext) { $ext | Select-Object -First 10 | ForEach-Object { "  $($_.LineNumber): $($_.Line.Trim())" } }
    else { '  чисто' }

    Section 'Размер артефакта'
    '{0:N0} байт' -f (Get-Item $Artifact).Length
}

Section 'Состояние git'
git status --short
git log --oneline -1

Section 'Вердикт'
if ($failed) { 'НЕ ПРИНЯТ: тесты красные' }
elseif (git status --short) { 'ВНИМАНИЕ: есть незакоммиченные правки — сабагент не закоммитил работу' }
else { 'Принят: тесты зелёные, дерево чистое' }
