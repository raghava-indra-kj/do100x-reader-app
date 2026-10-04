const path = require("node:path");
const { build } = require("esbuild");
const { dependencies } = require("../package.json");

// Bundle the shared ESM Markdown parser into the CommonJS backend. Keep runtime
// packages (notably Prisma) external so their native assets resolve normally.
build({
  entryPoints: [path.resolve(__dirname, "../src/index.ts")],
  outfile: path.resolve(__dirname, "../dist/index.js"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  sourcemap: true,
  external: Object.keys(dependencies).filter((name) => !["@reader/md-ast", "@reader/finance-core"].includes(name)),
}).then(() => console.log("Backend build complete")).catch(() => process.exit(1));
