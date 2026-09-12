/** Kernel smoke for candidates playtest (no browser).
 * - c01–c12: load + place first guest
 * - c01, c04: place → undo → assignment restored (T-025)
 * - c03: calm_bell invalid target no consume; rabbit valid consume (T-026)
 * - c02: two seated guests atomic swap (T-027)
 * Not a shipped-level claim. (T-016 … T-027)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evaluateLevel } from "../../src/core/index.js";
import {
  applyCalmProp,
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

// --- T-026: c03 calm_bell ---
const c03 = load("c03");
let assignment = createInitialAssignment(c03);
let calm = new Set();
let inventory = createInitialInventory(c03);
const stock0 = inventory.calm_bell ?? 0;
if (stock0 < 1) throw new Error("c03: expected calm_bell stock >= 1");

const miss = applyCalmProp(
  { assignment, calm, inventory },
  "calm_bell",
  "fox",
  c03,
);
if (miss.ok || miss.consumed || miss.reason !== "invalid-target") {
  throw new Error(`c03 miss: expected invalid-target no consume, got ${JSON.stringify(miss)}`);
}
if ((inventory.calm_bell ?? 0) !== stock0) {
  throw new Error("c03 miss: inventory mutated on invalid target");
}

const hit = applyCalmProp(
  { assignment, calm, inventory },
  "calm_bell",
  "rabbit",
  c03,
);
if (!hit.ok || !hit.consumed || hit.reason !== "applied" || !hit.next) {
  throw new Error(`c03 hit: expected applied, got ${JSON.stringify(hit)}`);
}
assignment = hit.next.assignment;
calm = hit.next.calm;
inventory = hit.next.inventory;
if (!calm.has("rabbit")) throw new Error("c03 hit: rabbit not calm");
if ((inventory.calm_bell ?? 0) !== stock0 - 1) {
  throw new Error(`c03 hit: stock should be ${stock0 - 1}, got ${inventory.calm_bell}`);
}

const calmBellResults = [{
  fileId: "c03",
  levelId: c03.id,
  miss: { target: "fox", reason: miss.reason, consumed: miss.consumed, stock: inventory.calm_bell + 1 },
  hit: { target: "rabbit", reason: hit.reason, consumed: hit.consumed, stock: inventory.calm_bell, calm: [...calm] },
}];

// --- T-027: c02 atomic swap ---
const c02 = load("c02");
let a2 = createInitialAssignment(c02);
const seats2 = c02.seats.slice();
const charA = c02.characters[0];
const charB = c02.characters[1];
const seatA = seats2[0];
const seatB = seats2[1];
const pA = applySeatAction(a2, charA, seatA, seats2);
if (!pA || pA.kind !== "move") throw new Error(`c02 place A failed: ${JSON.stringify(pA)}`);
a2 = pA.next;
const pB = applySeatAction(a2, charB, seatB, seats2);
if (!pB || pB.kind !== "move") throw new Error(`c02 place B failed: ${JSON.stringify(pB)}`);
a2 = pB.next;
if (a2[charA] !== seatA || a2[charB] !== seatB) {
  throw new Error("c02 pre-swap seats wrong");
}
const swapped = applySeatAction(a2, charA, seatB, seats2);
if (!swapped || swapped.kind !== "swap") {
  throw new Error(`c02 swap expected kind=swap, got ${JSON.stringify(swapped)}`);
}
a2 = swapped.next;
if (a2[charA] !== seatB || a2[charB] !== seatA) {
  throw new Error(`c02 swap seats not swapped: ${JSON.stringify({ a: a2[charA], b: a2[charB] })}`);
}
const swapResults = [{
  fileId: "c02",
  levelId: c02.id,
  pair: [charA, charB],
  before: { [charA]: seatA, [charB]: seatB },
  after: { [charA]: a2[charA], [charB]: a2[charB] },
  kind: swapped.kind,
}];

console.log("T-027 smoke OK: place/undo/calm_bell + c02 swap");
console.log(JSON.stringify({
  kind: "candidates-only",
  shippedClaim: false,
  results,
  undoResults,
  calmBellResults,
  swapResults,
}, null, 2));
