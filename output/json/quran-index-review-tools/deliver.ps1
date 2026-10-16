param([Parameter(Mandatory=$true)][string]$ManifestPath)
$ErrorActionPreference = 'Stop'
$reviewManifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$reviewDestination = (Resolve-Path -LiteralPath 'D:\Собираем файлы Hutba\Курсы\Коран\Индекс\Указатель аятов').Path
$reviewSourceRoot = (Resolve-Path -LiteralPath 'D:\Yandex.Disk\AstroProject\output\json').Path + [IO.Path]::DirectorySeparatorChar
if ($reviewManifest.destination -ne $reviewDestination -or -not $reviewManifest.validated -or $reviewManifest.files.Count -ne 4) { throw 'Unexpected delivery manifest' }
foreach ($reviewFile in $reviewManifest.files) {
    if ([IO.Path]::GetFileName($reviewFile.name) -ne $reviewFile.name -or $reviewFile.name -notmatch '^(Указатель аятов - (темы \d+-\d+|проверенные темы 1-\d+)\.json|Темы \d+-\d+ - (журнал проверки\.json|отчёт\.md))$') { throw 'Unexpected destination file name' }
    $reviewSource = (Resolve-Path -LiteralPath $reviewFile.source).Path
    if (-not $reviewSource.StartsWith($reviewSourceRoot, [StringComparison]::OrdinalIgnoreCase)) { throw 'Source is outside reviewed outputs' }
    $reviewTarget = Join-Path -Path $reviewDestination -ChildPath $reviewFile.name
    if ((Get-FileHash -LiteralPath $reviewSource -Algorithm SHA256).Hash.ToLowerInvariant() -ne $reviewFile.sha256) { throw 'Source checksum changed' }
    if ((Test-Path -LiteralPath $reviewTarget) -and (Get-FileHash -LiteralPath $reviewTarget -Algorithm SHA256).Hash.ToLowerInvariant() -ne $reviewFile.sha256) { throw 'Different destination file exists' }
}
foreach ($reviewFile in $reviewManifest.files) {
    $reviewTarget = Join-Path -Path $reviewDestination -ChildPath $reviewFile.name
    Copy-Item -LiteralPath $reviewFile.source -Destination $reviewTarget
    if ((Get-FileHash -LiteralPath $reviewTarget -Algorithm SHA256).Hash.ToLowerInvariant() -ne $reviewFile.sha256) { throw 'Delivery verification failed' }
}
Write-Output 'Saved and verified all 4 review files.'
