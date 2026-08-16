$host.ui.RawUI.WindowTitle = "Reader App Server [Initializing]"
npm install
Set-Location reader-backend
npx prisma generate
npx prisma db push
Set-Location ..
npm run build
Set-Location reader-backend
$host.ui.RawUI.WindowTitle = "Reader App Server [Running]"
node dist/index.js
