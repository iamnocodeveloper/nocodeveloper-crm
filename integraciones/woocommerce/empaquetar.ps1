# Rehace public/kooni-woocommerce.zip (lo que descarga el cliente desde
# Ajustes → WooCommerce). Rutas con "/" para que WordPress (Linux) lo abra bien.
# Uso: powershell -File integraciones/woocommerce/empaquetar.ps1
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$src = Join-Path $PSScriptRoot "kooni-woocommerce"
$dst = Join-Path $PSScriptRoot "..\..\public\kooni-woocommerce.zip"
if (Test-Path $dst) { Remove-Item $dst }
$fs = [IO.File]::Open($dst, 'Create')
$z = New-Object IO.Compression.ZipArchive($fs, [IO.Compression.ZipArchiveMode]::Create)
Get-ChildItem $src -Recurse -File | ForEach-Object {
  $rel = 'kooni-woocommerce/' + $_.FullName.Substring($src.Length + 1).Replace('\', '/')
  [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($z, $_.FullName, $rel) | Out-Null
}
$z.Dispose()
$fs.Dispose()
Write-Output "Listo: $dst"
