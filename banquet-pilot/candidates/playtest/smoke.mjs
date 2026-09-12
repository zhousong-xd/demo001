/** Kernel smoke for T-016 candidates playtest (no browser).
 * Proves c01 JSON + relative ESM core/board can place one guest.
 * Not a shipped-level claim.
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
const jsonPath = path.join(here, "../levels/c01.json");
const level = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
if (level.id !== "C01") throw new Error(`expected C01, got ${level.id}`);

const assignment = createInitialAssignment(level);
const inventory = createInitialInventory(level);
const placed = applySeatAction(assignment, "fox", "A1", level.seats);
if (!placed || placed.next.fox !== "A1") {
  throw new Error("place fox→A1 failed");
}
const ev = evaluateLevel(level, placed.next, { calm: new Set() });
if (!ev.ok) throw new Error(`eval not ok: ${ev.errors.join("; ")}`);

console.log("T-016 smoke OK: opened c01 and placed fox→A1");
console.log(JSON.stringify({
  kind: "candidates-only",
  shippedClaim: false,
  id: level.id,
  title: level.title,
  assignment: placed.next,
  seated: Object.values(placed.next).filter(Boolean).length,
  evalOk: ev.ok,
  inventory,
}, null, 2));
