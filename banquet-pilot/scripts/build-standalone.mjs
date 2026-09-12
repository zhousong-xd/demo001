#!/usr/bin/env node
/**
 * Build a single offline HTML with inlined CSS, JS modules, and level JSON.
 * No npm packaging — pure Node ESM graph walk + string pack.
 *
 * Usage (from banquet-pilot/ or repo root):
 *   node banquet-pilot/scripts/build-standalone.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");
const OUT_DIR = path.join(ROOT, "dist");
const OUT_HTML = path.join(OUT_DIR, "banquet-pilot.html");

const IMPORT_RE =
  /(?:import\s+(?:type\s+)?(?:([\s\S]*?)\s+from\s+)?|export\s+(?:type\s+)?(?:\{[^}]*\}\s*from\s+|\*\s+from\s+))["'](\.[^"']+)["']\s*;?/g;
const FROM_ONLY_RE = /(?:import|export)\s+[^;]*?from\s+["'](\.[^"']+)["']/g;

function resolveImport(fromFile, spec) {
  let p = path.resolve(path.dirname(fromFile), spec);
  if (!p.endsWith(".js")) p += ".js";
  return p;
}

function stripImportsAndExports(code) {
  // Remove import / export-from lines
  let out = code.replace(IMPORT_RE, "");
  out = out.replace(/^export\s+\{[^}]*\}\s*from\s+["'][^"']+["']\s*;?\s*$/gm, "");
  out = out.replace(/^export\s+\*\s+from\s+["'][^"']+["']\s*;?\s*$/gm, "");
  // export async function / export function / export const / export { }
  out = out.replace(/^export\s+async\s+function\s+/gm, "async function ");
  out = out.replace(/^export\s+function\s+/gm, "function ");
  out = out.replace(/^export\s+class\s+/gm, "class ");
  out = out.replace(/^export\s+const\s+/gm, "const ");
  out = out.replace(/^export\s+let\s+/gm, "let ");
  out = out.replace(/^export\s+var\s+/gm, "var ");
  out = out.replace(/^export\s+default\s+/gm, "");
  out = out.replace(/^export\s*\{[^}]*\}\s*;?\s*$/gm, "");
  return out;
}

function collect(entryRel) {
  const entry = path.join(SRC, entryRel);
  const order = [];
  const seen = new Set();

  function walk(file) {
    const abs = path.resolve(file);
    if (seen.has(abs)) return;
    seen.add(abs);
    const code = readFileSync(abs, "utf8");
    const deps = [];
    for (const m of code.matchAll(FROM_ONLY_RE)) {
      const spec = m[1];
      if (!spec.startsWith(".")) continue;
      const dep = resolveImport(abs, spec);
      // Skip node builtins / loader
      if (dep.includes(`${path.sep}loader.js`)) continue;
      deps.push(dep);
    }
    for (const d of deps) walk(d);
    order.push(abs);
  }

  walk(entry);
  return order;
}

function loadLevels() {
  const dir = path.join(ROOT, "levels");
  /** @type {Record<string, object>} */
  const map = {};
  for (const f of readdirSync(dir)) {
    if (!f.endsWith(".json")) continue;
    const raw = JSON.parse(readFileSync(path.join(dir, f), "utf8"));
    map[String(raw.id).toUpperCase()] = raw;
  }
  return map;
}

function main() {
  // UI entry pulls core via index — avoid solver if possible by using a shim entry.
  // Walk from app.js; index.js re-exports solver — include solver.js (small, ok).
  const files = collect("ui/app.js");
  const parts = [];
  for (const f of files) {
    const rel = path.relative(ROOT, f);
    const raw = readFileSync(f, "utf8");
    parts.push(`\n/* ==== ${rel} ==== */\n${stripImportsAndExports(raw)}\n`);
  }

  const levels = loadLevels();
  const css = readFileSync(path.join(SRC, "ui/app.css"), "utf8");
  const jsBody = parts.join("\n");

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
  <meta name="color-scheme" content="dark" />
  <title>宴席灰盒 · Banquet Pilot（离线单文件）</title>
  <style>
${css}
  </style>
</head>
<body>
  <div id="app">加载中…</div>
  <script>
    window.__BANQUET_EMBEDDED_LEVELS__ = ${JSON.stringify(levels)};
  </script>
  <script type="module">
${jsBody}
  </script>
</body>
</html>
`;

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_HTML, html, "utf8");
  const buf = readFileSync(OUT_HTML);
  const sha = createHash("sha256").update(buf).digest("hex");
  const meta = {
    path: "banquet-pilot/dist/banquet-pilot.html",
    bytes: buf.length,
    sha256: sha,
    levels: Object.keys(levels).sort(),
    modules: files.map((f) => path.relative(ROOT, f)),
  };
  writeFileSync(
    path.join(OUT_DIR, "banquet-pilot.meta.json"),
    JSON.stringify(meta, null, 2) + "\n",
    "utf8",
  );
  console.log(JSON.stringify(meta, null, 2));
}

main();
