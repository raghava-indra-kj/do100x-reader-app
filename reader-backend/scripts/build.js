const fs = require("fs");
const path = require("path");
const ts = require("typescript");

function transpileDirectory(srcDir, outDir) {
  fs.mkdirSync(outDir, { recursive: true });

  const entries = fs.readdirSync(srcDir);
  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry);
    const outPath = path.join(outDir, entry);

    if (fs.statSync(srcPath).isDirectory()) {
      transpileDirectory(srcPath, outPath);
    } else if (srcPath.endsWith(".ts")) {
      const code = fs.readFileSync(srcPath, "utf8");
      const result = ts.transpileModule(code, {
        compilerOptions: {
          target: ts.ScriptTarget.ES2020,
          module: ts.ModuleKind.CommonJS,
          esModuleInterop: true,
        },
      });
      const targetJs = outPath.replace(/\.ts$/, ".js");
      fs.writeFileSync(targetJs, result.outputText, "utf8");
    }
  }
}

const rootSrc = path.resolve(__dirname, "../src");
const rootDist = path.resolve(__dirname, "../dist");

console.log("Building reader-backend TypeScript...");
const start = Date.now();
transpileDirectory(rootSrc, rootDist);
console.log(`Backend build complete in ${Date.now() - start}ms.`);
