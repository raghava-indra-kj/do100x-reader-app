$host.ui.RawUI.WindowTitle = "Reader App Server [Initializing]"
Set-Location -LiteralPath $PSScriptRoot
npm run prod
exit $LASTEXITCODE
