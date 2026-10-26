import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Prohíbe GLSL crudo y materiales de shader clásicos: con `WebGPURenderer` (backend WebGPU) no
 * funcionan, y todo el código de GPU del proyecto es TSL (`webgl/nodes`, `NodeMaterial`).
 * Falla si encuentra `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile` o archivos
 * `.glsl/.vert/.frag/.vs/.fs`. ESLint lo impone también en el editor (regla `no-restricted-syntax`).
 */
export const FORBIDDEN_SYMBOLS = /\b(RawShaderMaterial|ShaderMaterial|onBeforeCompile)\b/;
export const FORBIDDEN_EXTENSIONS = new Set([".glsl", ".vert", ".frag", ".vs", ".fs"]);
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
/** La configuración de ESLint nombra los símbolos prohibidos para poder prohibirlos. */
const SKIP_FILES = new Set(["eslint.config.mjs"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git", "openspec", "docs", "coverage", ".claude"]);

export interface Violation {
  file: string;
  reason: string;
}

export function findViolations(root: string, selfPath = ""): Violation[] {
  const out: Violation[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      if (SKIP_DIRS.has(name)) continue;
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      const ext = extname(name);
      const rel = relative(root, full);
      if (FORBIDDEN_EXTENSIONS.has(ext)) out.push({ file: rel, reason: `archivo ${ext}` });
      else if (SOURCE_EXTENSIONS.has(ext) && !SKIP_FILES.has(name) && full !== selfPath && !name.endsWith(".test.ts")) {
        const match = FORBIDDEN_SYMBOLS.exec(readFileSync(full, "utf8"));
        if (match) out.push({ file: rel, reason: `usa ${match[1]}` });
      }
    }
  };
  walk(root);
  return out;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ?? process.cwd();
  const violations = findViolations(root, fileURLToPath(import.meta.url));
  if (violations.length > 0) {
    for (const v of violations) console.error(`✗ ${v.file}: ${v.reason}`);
    console.error("\nGLSL / ShaderMaterial prohibidos: escribe el shader en TSL (webgl/nodes).");
    process.exit(1);
  }
  console.log("check:no-glsl OK: sin GLSL, ShaderMaterial, RawShaderMaterial ni onBeforeCompile.");
}
