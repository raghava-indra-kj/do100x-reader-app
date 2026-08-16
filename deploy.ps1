npm install
Set-Location reader-backend
npx prisma generate
npx prisma db push
Set-Location ..
npm run build
Set-Location reader-backend
node dist/index.js
