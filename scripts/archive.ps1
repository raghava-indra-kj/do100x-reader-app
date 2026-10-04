param(
    [Parameter(Mandatory = $true)][string]$SourceDirectory,
    [Parameter(Mandatory = $true)][string]$DestinationZip
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
# Include hidden configuration and explicitly use ZIP-standard forward slashes.
# Windows PowerShell's .NET Framework can otherwise write backslash entry names,
# which Linux unzip does not reliably interpret as directory separators.
$sourceRoot = (Resolve-Path -LiteralPath $SourceDirectory).Path.TrimEnd([System.IO.Path]::DirectorySeparatorChar)
$archiveStream = [System.IO.File]::Open(
    $DestinationZip,
    [System.IO.FileMode]::CreateNew,
    [System.IO.FileAccess]::Write,
    [System.IO.FileShare]::None
)
$archive = $null
try {
    $archive = [System.IO.Compression.ZipArchive]::new($archiveStream, [System.IO.Compression.ZipArchiveMode]::Create, $false)
    foreach ($file in Get-ChildItem -LiteralPath $sourceRoot -Recurse -Force -File) {
        $entryName = $file.FullName.Substring($sourceRoot.Length + 1).Replace('\', '/')
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
            $archive,
            $file.FullName,
            $entryName,
            [System.IO.Compression.CompressionLevel]::Optimal
        ) | Out-Null
    }
} finally {
    if ($null -ne $archive) { $archive.Dispose() }
    $archiveStream.Dispose()
}
