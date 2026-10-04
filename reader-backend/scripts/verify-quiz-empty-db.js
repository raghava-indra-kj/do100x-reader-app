// Verifies the whole Prisma schema against a brand-new disposable MySQL database.
// The database name is generated here and only that newly created database is dropped.
const { randomBytes } = require("node:crypto");
const { spawnSync } = require("node:child_process");
const { PrismaClient } = require("@prisma/client");
require("dotenv").config({ quiet: true });

const configuredUrl = process.env.DATABASE_URL;
if (!configuredUrl) throw new Error("DATABASE_URL is required");
const parsedUrl = new URL(configuredUrl);
const originalDatabase = decodeURIComponent(parsedUrl.pathname.slice(1));
const temporaryDatabase = `reader_quiz_verify_${randomBytes(8).toString("hex")}`;
if (!originalDatabase || !/^reader_quiz_verify_[a-f0-9]{16}$/.test(temporaryDatabase) || originalDatabase === temporaryDatabase) {
  throw new Error("Unsafe temporary database target");
}
parsedUrl.pathname = `/${temporaryDatabase}`;
const temporaryUrl = parsedUrl.toString();
const root = new PrismaClient();
let fresh;
let created = false;

function prismaCli(args) {
  const result = spawnSync(process.execPath, [require.resolve("prisma"), ...args], {
    cwd: process.cwd(), env: { ...process.env, DATABASE_URL: temporaryUrl }, encoding: "utf8", timeout: 120_000,
  });
  if (result.status !== 0) throw new Error(`Prisma verification failed: ${result.stderr || result.stdout || result.error || result.status}`);
}

async function main() {
  try {
    await root.$executeRawUnsafe(`CREATE DATABASE \`${temporaryDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    created = true;
    fresh = new PrismaClient({ datasources: { db: { url: temporaryUrl } } });
    prismaCli(["migrate", "deploy", "--schema", "prisma/schema.prisma"]);
    prismaCli(["migrate", "diff", "--from-schema-datasource", "prisma/schema.prisma", "--to-schema-datamodel", "prisma/schema.prisma", "--exit-code"]);
    const rows = await fresh.$queryRawUnsafe("SELECT COUNT(*) AS total FROM quiz");
    if (Number(rows[0]?.total) !== 0) throw new Error("Fresh quiz table was not empty");
    console.log("Fresh MySQL schema verified; quiz table is empty.");
  } finally {
    if (fresh) await fresh.$disconnect();
    if (created) {
      try {
        await root.$executeRawUnsafe(`DROP DATABASE \`${temporaryDatabase}\``);
        console.log(`Removed disposable database ${temporaryDatabase}.`);
      } catch (error) {
        console.error(`Could not remove disposable database ${temporaryDatabase}; remove that exact database manually.`);
        throw error;
      }
    }
    await root.$disconnect();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
