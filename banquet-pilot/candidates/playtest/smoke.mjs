/** Kernel smoke for candidates playtest (no browser).
 * Proves c01–c12 JSON + relative ESM core/board can load and place one guest.
 * Not a shipped-level claim. (T-016 / T-019 / T-023 / T-024)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateLevel } from "../../src/core/index.js";
import {
  applySeatAction,
  createInitialAssignment,
  createInitialInventory,
} from "../../src/ui/board.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function load(id) {
  const jsonPath = path.join(here, `../levels/${id}.json`);
  return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
}

const IDS = [
  "c01", "c02", "c03", "c04", "c05", "c06",
  "c07", "c08", "c09", "c10", "c11", "c12",
];
const results = [];
for (const id of IDS) {
  const level = load(id);
  const assignment = createInitialAssignment(level);
  const inventory = createInitialInventory(level);
  const char0 = level.characters[0];
  const seat0 = level.seats[0];
  const placed = applySeatAction(assignment, char0, seat0, level.seats);
  if (!placed || placed.next[char0] !== seat0) {
    throw new Error(`${id}: place ${char0}→${seat0} failed`);
  }
  const ev = evaluateLevel(level, placed.next, { calm: new Set() });
  if (!ev.ok) throw new Error(`${id}: eval not ok: ${ev.errors.join("; ")}`);
  results.push({
    fileId: id,
    levelId: level.id,
    title: level.title,
    placed: `${char0}→${seat0}`,
    seated: Object.values(placed.next).filter(Boolean).length,
    chars: level.characters.length,
    seats: level.seats.length,
    evalOk: ev.ok,
    bell: inventory.calm_bell ?? 0,
  });
}

console.log("T-024 smoke OK: switched c01→c12 (kernel) and placed first guest each");
console.log(JSON.stringify({ kind: "candidates-only", shippedClaim: false, results }, null, 2));
