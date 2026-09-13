/** Load level JSON files (Node). Browser code should import JSON or fetch instead. */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateLevel } from "./rules.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const LEVELS_DIR = path.resolve(__dirname, "../../levels");

/**
 * @param {string} levelId
 */
export function loadLevel(levelId) {
  const name = String(levelId).toLowerCase();
  let filePath = path.join(LEVELS_DIR, `${name}.json`);
  if (!fs.existsSync(filePath)) {
    filePath = path.join(LEVELS_DIR, `${name.replace(/L/g, "l")}.json`);
  }
  const raw = fs.readFileSync(filePath, "utf8");
  const data = JSON.parse(raw);
  const errors = validateLevel(data);
  if (errors.length > 0) {
    throw new Error(`invalid level ${data.id || levelId}: ${errors.join("; ")}`);
  }
  return data;
}

export function loadAllLevels() {
  /** @type {Record<string, object>} */
  const out = {};
  const files = fs
    .readdirSync(LEVELS_DIR)
    .filter((f) => /^l.*\.json$/i.test(f))
    .sort();
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(LEVELS_DIR, f), "utf8"));
    const errors = validateLevel(data);
    if (errors.length > 0) {
      throw new Error(`invalid level ${data.id}: ${errors.join("; ")}`);
    }
    out[data.id] = data;
  }
  return out;
}
