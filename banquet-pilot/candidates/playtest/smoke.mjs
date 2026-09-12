/** Kernel smoke for candidates playtest (no browser).
 * - c01–c12: load + place first guest
 * - c01, c04: place → undo → assignment restored (T-025)
 * Not a shipped-level claim. (T-016 / T-019 / T-023 / T-024 / T-025)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateLevel } from "../../src/core/index.js";
import {
  applySeatAction,
  createHistory,
  createInitialAssignment,
  createInitialInventory,
  popPlayHistory,
  pushPlayHistory,
  snapshotPlay,
} from "../../src/ui/board.js";

const here = path.dirname(fileURLToPath(import.meta.url));

function load(id) {
  const jsonPath = path.join(here, `../levels/${id}.json`);
  return JSON.parse(fs.readFileSync(jsonPath, "utf8"));
}

function sameAssignment(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if ((a[k] ?? null) !== (b[k] ?? null)) return false;
  }
  return true;
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

const UNDO_IDS = ["c01", "c04"];
const undoResults = [];
for (const id of UNDO_IDS) {
  const level = load(id);
  let assignment = createInitialAssignment(level);
  let calm = new Set();
  let inventory = createInitialInventory(level);
  const history = createHistory();
  const before = snapshotPlay({ assignment, calm, inventory });
  const char0 = level.characters[0];
  const seat0 = level.seats[0];
  const placed = applySeatAction(assignment, char0, seat0, level.seats);
  if (!placed || placed.next[char0] !== seat0) {
    throw new Error(`${id} undo-setup: place failed`);
  }
  pushPlayHistory(history, before);
  assignment = placed.next;
  const seated = Object.values(assignment).filter(Boolean).length;
  if (seated < 1) throw new Error(`${id} undo-setup: expected seated >= 1`);

  const prev = popPlayHistory(history);
  if (!prev) throw new Error(`${id}: popPlayHistory returned null`);
  assignment = prev.assignment;
  calm = prev.calm;
  inventory = prev.inventory;

  if (!sameAssignment(assignment, before.assignment)) {
    throw new Error(`${id}: undo did not restore assignment`);
  }
  if (Object.values(assignment).filter(Boolean).length !== 0) {
    throw new Error(`${id}: after undo expected empty board`);
  }
  if (history.length !== 0) {
    throw new Error(`${id}: history should be empty after one undo`);
  }
  undoResults.push({
    fileId: id,
    levelId: level.id,
    place: `${char0}→${seat0}`,
    undo: "restored-empty",
    historyLen: history.length,
  });
}

console.log("T-025 smoke OK: c01–c12 place + undo on c01/c04");
console.log(JSON.stringify({
  kind: "candidates-only",
  shippedClaim: false,
  results,
  undoResults,
}, null, 2));
