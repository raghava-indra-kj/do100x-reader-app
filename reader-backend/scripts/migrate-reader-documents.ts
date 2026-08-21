import { prisma } from "../src/prisma";
import { migrateLegacyReaderDataForUser } from "../src/reader-document-migration";

async function main() {
  const users = await prisma.user_account.findMany({
    select: { id: true, readerProfile: { select: { homepageId: true } } },
  });
  const results = [];
  for (const user of users) results.push(await migrateLegacyReaderDataForUser(user));
  console.log(JSON.stringify({ users: results, migratedUsers: results.length }, null, 2));
}

main()
  .catch((error) => {
    console.error("Reader document migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
