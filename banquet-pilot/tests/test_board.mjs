/** Unit tests for T-003 board state (move/swap/displace/undo). */

import test from "node:test";
import assert from "node:assert/strict";
import { loadLevel } from "../src/core/loader.js";
import { evaluateLevel, isWin } from "../src/core/rules.js";
import {
  applySeatAction,
  assertBoardIntegrity,
  cloneAssignment,
  createHistory,
  createInitialAssignment,
  occupantOf,
  popHistory,
  pushHistory,
} from "../src/ui/board.js";

test("initial: all waiting", () => {
  const level = loadLevel("l01");
  const asg = createInitialAssignment(level);
  for (const c of level.characters) assert.equal(asg[c], null);
  assert.equal(isWin(level, asg), false);
});

test("move to empty seat", () => {
  const level = loadLevel("l01");
  let asg = createInitialAssignment(level);
  const r = applySeatAction(asg, "fox", "A1", level.seats);
  assert.ok(r);
  assert.equal(r.kind, "move");
  assert.equal(r.next.fox, "A1");
  assertBoardIntegrity(r.next, level.characters, level.seats);
});

test("same-seat is null (no history)", () => {
  const level = loadLevel("l01");
  let asg = createInitialAssignment(level);
  asg = applySeatAction(asg, "fox", "A1", level.seats).next;
  assert.equal(applySeatAction(asg, "fox", "A1", level.seats), null);
});

test("atomic swap of two seated", () => {
  const level = loadLevel("l01");
  let asg = createInitialAssignment(level);
  asg = applySeatAction(asg, "fox", "A1", level.seats).next;
  asg = applySeatAction(asg, "rabbit", "A2", level.seats).next;
  const r = applySeatAction(asg, "fox", "A2", level.seats);
  assert.equal(r.kind, "swap");
  assert.equal(r.next.fox, "A2");
  assert.equal(r.next.rabbit, "A1");
  assertBoardIntegrity(r.next, level.characters, level.seats);
});

test("waiting displace sends occupant to waiting", () => {
  const level = loadLevel("l01");
  let asg = createInitialAssignment(level);
  asg = applySeatAction(asg, "fox", "A1", level.seats).next;
  const r = applySeatAction(asg, "rabbit", "A1", level.seats);
  assert.equal(r.kind, "displace");
  assert.equal(r.next.rabbit, "A1");
  assert.equal(r.next.fox, null);
  assertBoardIntegrity(r.next, level.characters, level.seats);
});

test("undo restores full board after swap", () => {
  const level = loadLevel("l01");
  let asg = createInitialAssignment(level);
  const hist = createHistory();
  const step = (char, seat) => {
    const before = cloneAssignment(asg);
    const r = applySeatAction(asg, char, seat, level.seats);
    assert.ok(r);
    pushHistory(hist, before);
    asg = r.next;
  };
  step("fox", "A1");
  step("rabbit", "A2");
  const beforeSwap = cloneAssignment(asg);
  step("fox", "A2");
  assert.equal(asg.fox, "A2");
  assert.equal(asg.rabbit, "A1");
  asg = popHistory(hist);
  assert.deepEqual(asg, beforeSwap);
  assertBoardIntegrity(asg, level.characters, level.seats);
});

test("L01 known solution wins via isWin/evaluateLevel", () => {
  const level = loadLevel("l01");
  const asg = { ...level.known_solution };
  const ev = evaluateLevel(level, asg);
  assert.equal(ev.ok, true);
  assert.ok(ev.rules.every((r) => r.status === "SATISFIED"));
  assert.equal(isWin(level, asg), true);
});

test("L02 known solution wins", () => {
  const level = loadLevel("l02");
  assert.equal(isWin(level, level.known_solution), true);
});

test("!ok never all-green: empty rules on illegal", () => {
  const level = loadLevel("l01");
  const asg = { fox: "A1", rabbit: "A1", crane: null, otter: null }; // double occupy
  const ev = evaluateLevel(level, asg);
  assert.equal(ev.ok, false);
  assert.deepEqual(ev.rules, []);
  assert.equal(isWin(level, asg), false);
  // UI must not treat rules.every() on [] as win when !ok
  const naive = ev.ok && ev.rules.every((r) => r.status === "SATISFIED");
  assert.equal(naive, false);
});

test("occupantOf", () => {
  const asg = { fox: "A1", rabbit: null };
  assert.equal(occupantOf(asg, "A1"), "fox");
  assert.equal(occupantOf(asg, "A2"), null);
});
