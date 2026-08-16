npm install
npx prisma db push --schema=reader-backend/prisma/schema.prisma
npm run build

Set-Location reader-backend
node dist/index.js
