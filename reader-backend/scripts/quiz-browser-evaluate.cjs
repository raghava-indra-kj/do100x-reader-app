// Adds AI feedback to a disposable browser fixture through the real service.
const { randomUUID } = require('node:crypto');
const Module = require('node:module');
require('dotenv').config({ quiet: true });
const name = process.env.QUIZ_BROWSER_DATABASE;
if (!/^reader_quiz_browser_[a-f0-9]{16}$/.test(name || '')) throw new Error('Specify the exact disposable browser database name');
const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) throw new Error('Only local MySQL is allowed');
url.pathname = `/${name}`;
const isolated = require(process.env.QUIZ_TEST_CLIENT_MODULE || '@prisma/client');
const load = Module._load;
Module._load = function (request, parent, isMain) { return request === '@prisma/client' ? isolated : load.call(this, request, parent, isMain); };
require('ts-node/register/transpile-only');
const { recordEvaluations } = require('../src/quiz/evaluation-service');
const db = new isolated.PrismaClient({ datasources: { db: { url: url.toString() } } });

async function main() {
  const attempt = await db.quiz_attempt.findFirst({ where: { status: 'SUBMITTED' }, include: { revision: { include: { questions: true } } } });
  if (!attempt) throw new Error('No submitted fixture attempt');
  const subjective = attempt.revision.questions.find((question) => question.kind === 'SUBJECTIVE');
  if (!subjective) throw new Error('No subjective fixture question');
  const result = await recordEvaluations(db, attempt.userId, attempt.id, {
    requestKey: randomUUID(), modelId: 'browser-fixture', promptVersion: 'v1',
    evaluations: [{ questionId: subjective.id, verdict: 'CORRECT', scorePercent: 100, feedbackMarkdown: 'You explained the evaluation order clearly. **Well done.**' }],
  });
  console.log(JSON.stringify({ attemptId: attempt.id, feedbackCount: result.evaluations.length }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
