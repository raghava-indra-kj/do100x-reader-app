@echo off
call npm install
call npx prisma generate --schema=reader-backend/prisma/schema.prisma
call npx prisma db push --schema=reader-backend/prisma/schema.prisma
call npm run build
cd reader-backend
node dist/index.js
