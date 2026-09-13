import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const folder = new URL("./", import.meta.url);
const readSource = source => readFileSync(new URL(source, folder), "utf8").replace(/\r\n/g, "\n");
const sourcePaths = ["../../src/core/geometry.js", "../../src/core/rules.js", "../../src/ui/board.js", "model.mjs", "app.mjs"];
const script = sourcePaths.map(source => readSource(source)
  .replace(/^import .+;\r?$/gm, "")
  .replace(/^export /gm, "")).join("\n;\n");
if (/<\/script/i.test(script)) throw new Error("Unexpected closing script tag");
const checked = spawnSync(process.execPath, ["--check", "--input-type=module"], { input: script, encoding: "utf8" });
if (checked.status !== 0) throw new Error(checked.stderr || "Bundle syntax check failed");
const template = readSource("index.template.html");
const css = readSource("style.css");
const guests = readSource("guests.html");
const html = template.replace("<!--WARM_GUESTS-->", () => guests).replace("<!--WARM_STYLE-->", () => "<style>" + css + "</style>")
  .replace("<!--WARM_SCRIPT-->", () => '<script type="module">' + script + "</script>");
if (html.includes("<!--WARM_")) throw new Error("Unresolved template marker");
writeFileSync(new URL("index.html", folder), html);
console.log(JSON.stringify({ file: fileURLToPath(new URL("index.html", folder)), bytes: Buffer.byteLength(html), sha256: createHash("sha256").update(html).digest("hex") }));
