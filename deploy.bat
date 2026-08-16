@echo off
title Reader App Server [Initializing]
call npm install
cd reader-backend
call npx prisma generate
call npx prisma db push
cd ..
call npm run build
cd reader-backend
title Reader App Server [Running]
node dist/index.js
