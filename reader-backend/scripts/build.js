const path = require("node:path");
const { build } = require("esbuild");
const { dependencies } = require("../package.json");

// Bundle the shared ESM Markdown parser into the CommonJS backend. Keep runtime
// packages (notably Prisma) external so their native assets resolve normally.
build({
  entryPoints: {
    index: path.resolve(__dirname, "../src/index.ts"),
    "repair-task-lists": path.resolve(__dirname, "../src/repair-task-lists.ts"),
    "ical-worker": path.resolve(__dirname, "../src/calendar/ical-worker.ts"),
  },
  outdir: path.resolve(__dirname, "../dist"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  sourcemap: true,
  // Dev watches this source. Resolve it directly so parser edits cannot use a stale dist.
  alias: { "@reader/md-ast": path.resolve(__dirname, "../../packages/md-ast/src/index.ts") },
  external: Object.keys(dependencies).filter((name) => !["@reader/md-ast", "@reader/finance-core", "@reader/habit-core", "@reader/calendar-core"].includes(name)),
}).then(() => console.log("Backend build complete")).catch(() => process.exit(1));
