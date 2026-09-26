$ErrorActionPreference = 'Stop'

$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$repo = Split-Path -Parent $MyInvocation.MyCommand.Path

$link = Join-Path $desktop 'Где моё.lnk'
$icon = Join-Path $repo 'fin.ico'
$sc = $ws.CreateShortcut($link)
$sc.TargetPath = Join-Path $repo 'start.bat'
$sc.WorkingDirectory = $repo
$sc.IconLocation = $(if (Test-Path -LiteralPath $icon) { $icon } else { "$env:SystemRoot\System32\SHELL32.dll,61" })
$sc.Description = 'Запуск приложения «Где моё»'
$sc.Save()

$old = Join-Path $desktop 'Где мои деньги.lnk'
if (Test-Path -LiteralPath $old) {
  Remove-Item -LiteralPath $old -Force
  Write-Output "Удалён старый ярлык: $old"
}

Write-Output "Ярлык создан: $link"
