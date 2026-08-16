npm install
npx prisma generate --schema=reader-backend/prisma/schema.prisma
npx prisma db push --schema=reader-backend/prisma/schema.prisma
npm run build

Set-Location reader-backend
node dist/index.js
