/** Unit tests for T-004: calm prop, undo/restart, win, save validation, hints. */

import test from "node:test";
import assert from "node:assert/strict";
import { loadLevel } from "../src/core/loader.js";
import { evaluateLevel, isWin } from "../src/core/rules.js";
import {
  applyCalmProp,
  applySeatAction,
  createHistory,
  createInitialAssignment,
  createInitialInventory,
  popPlayHistory,
  pushPlayHistory,
  snapshotPlay,
} from "../src/ui/board.js";
import { hintText, maxHintTier, LEVEL_HINTS } from "../src/ui/hints.js";
import {
  SAVE_VERSION,
  validateSavePayload,
} from "../src/ui/save.js";

test("L03 inventory starts with calm_bell stock 1", () => {
  const level = loadLevel("l03");
  const inv = createInitialInventory(level);
  assert.equal(inv.calm_bell, 1);
});

test("calm_bell valid on rabbit consumes once", () => {
  const level = loadLevel("l03");
  let state = {
    assignment: createInitialAssignment(level),
    calm: new Set(),
    inventory: createInitialInventory(level),
  };
  const r = applyCalmProp(state, "calm_bell", "rabbit", level);
  assert.equal(r.ok, true);
  assert.equal(r.consumed, true);
  assert.equal(r.reason, "applied");
  assert.ok(r.next.calm.has("rabbit"));
  assert.equal(r.next.inventory.calm_bell, 0);
});

test("calm_bell invalid target does not consume", () => {
  const level = loadLevel("l03");
  const state = {
    assignment: createInitialAssignment(level),
    calm: new Set(),
    inventory: createInitialInventory(level),
  };
  const r = applyCalmProp(state, "calm_bell", "fox", level);
  assert.equal(r.ok, false);
  assert.equal(r.consumed, false);
  assert.equal(r.reason, "invalid-target");
  assert.equal(state.inventory.calm_bell, 1);
  assert.equal(state.calm.size, 0);
});

test("repeat calm on already-calm rabbit no extra consume", () => {
  const level = loadLevel("l03");
  let state = {
    assignment: createInitialAssignment(level),
    calm: new Set(["rabbit"]),
    inventory: { calm_bell: 1 },
  };
  const r = applyCalmProp(state, "calm_bell", "rabbit", level);
  assert.equal(r.ok, true);
  assert.equal(r.consumed, false);
  assert.equal(r.reason, "already-calm");
  assert.equal(r.next, null);
  assert.equal(state.inventory.calm_bell, 1);
});

test("calm follows character seat moves; undo restores effect+inventory", () => {
  const level = loadLevel("l03");
  let state = {
    assignment: createInitialAssignment(level),
    calm: new Set(),
    inventory: createInitialInventory(level),
  };
  const hist = createHistory();

  const beforeCalm = snapshotPlay(state);
  const applied = applyCalmProp(state, "calm_bell", "rabbit", level);
  assert.ok(applied.next);
  pushPlayHistory(hist, beforeCalm);
  state = { ...applied.next };

  const beforeMove = snapshotPlay(state);
  const moved = applySeatAction(state.assignment, "rabbit", "B1", level.seats);
  assert.ok(moved);
  pushPlayHistory(hist, beforeMove);
  state = {
    assignment: moved.next,
    calm: state.calm,
    inventory: state.inventory,
  };
  assert.equal(state.assignment.rabbit, "B1");
  assert.ok(state.calm.has("rabbit"));
  assert.equal(state.inventory.calm_bell, 0);

  // undo move
  state = popPlayHistory(hist);
  assert.equal(state.assignment.rabbit, null);
  assert.ok(state.calm.has("rabbit"));
  assert.equal(state.inventory.calm_bell, 0);

  // undo calm
  state = popPlayHistory(hist);
  assert.equal(state.calm.has("rabbit"), false);
  assert.equal(state.inventory.calm_bell, 1);
});

test("restart inventory restores initial stock (no farming)", () => {
  const level = loadLevel("l03");
  let inv = createInitialInventory(level);
  inv.calm_bell = 0;
  // restart = recreate from level def
  inv = createInitialInventory(level);
  assert.equal(inv.calm_bell, 1);
});

test("L03 win requires calm rabbit on known solution", () => {
  const level = loadLevel("l03");
  const asg = { ...level.known_solution_with_calm_rabbit };
  assert.equal(isWin(level, asg, { calm: [] }), false);
  assert.equal(isWin(level, asg, { calm: ["rabbit"] }), true);
  const ev = evaluateLevel(level, asg, { calm: ["rabbit"] });
  assert.equal(ev.ok, true);
  assert.ok(ev.rules.every((r) => r.status === "SATISFIED"));
});

test("three-tier free hints exist for L01/L02/L03", () => {
  for (const id of ["L01", "L02", "L03"]) {
    assert.equal(maxHintTier(id), 3);
    assert.ok(LEVEL_HINTS[id].length === 3);
    assert.ok(hintText(id, 1).length > 5);
    assert.ok(hintText(id, 3).length > 5);
  }
});

test("validateSavePayload rejects corrupt / wrong version", () => {
  const level = loadLevel("l01");
  assert.equal(validateSavePayload(null, level), null);
  assert.equal(validateSavePayload({ version: 999 }, level), null);
  assert.equal(
    validateSavePayload(
      {
        version: SAVE_VERSION,
        levelId: "L01",
        assignment: { fox: "A1" }, // missing chars
        calm: [],
        inventory: {},
        history: [],
        hintTier: 0,
        clearedLevels: [],
      },
      level,
    ),
    null,
  );
  const goodAsg = createInitialAssignment(level);
  const ok = validateSavePayload(
    {
      version: SAVE_VERSION,
      levelId: "L01",
      assignment: goodAsg,
      calm: [],
      inventory: {},
      history: [],
      hintTier: 1,
      clearedLevels: ["L01"],
      savedAt: "2026-09-12T00:00:00Z",
    },
    level,
  );
  assert.ok(ok);
  assert.equal(ok.hintTier, 1);
});

test("validateSavePayload rejects double-occupy", () => {
  const level = loadLevel("l01");
  const asg = createInitialAssignment(level);
  asg.fox = "A1";
  asg.rabbit = "A1";
  assert.equal(
    validateSavePayload(
      {
        version: SAVE_VERSION,
        levelId: "L01",
        assignment: asg,
        calm: [],
        inventory: {},
        history: [],
        hintTier: 0,
        clearedLevels: [],
      },
      level,
    ),
    null,
  );
});
