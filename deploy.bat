@echo off
call npm install
cd reader-backend
call npx prisma generate
call npx prisma db push
cd ..
call npm run build
cd reader-backend
node dist/index.js
