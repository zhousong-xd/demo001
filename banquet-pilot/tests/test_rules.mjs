/** Independent unit tests for Banquet Pilot T-002 rule kernel (Node built-ins only). */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  adjacent,
  faces,
  isEnd,
  seatsForLayout,
} from "../src/core/geometry.js";
import {
  CONFLICT,
  PENDING,
  SATISFIED,
  evaluateLevel,
  evaluateRule,
  isWin,
  resolveEffectiveCalm,
  validateAssignment,
  validateLevel,
} from "../src/core/rules.js";
import { loadLevel } from "../src/core/loader.js";
import { countSolutions, enumerateSolutions } from "../src/core/solver.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

test("geometry: adjacent same row only", () => {
  assert.equal(adjacent("A1", "A2"), true);
  assert.equal(adjacent("A2", "A3"), true);
  assert.equal(adjacent("A1", "A3"), false);
  assert.equal(adjacent("A1", "B1"), false);
  assert.equal(adjacent("A1", "B2"), false);
});

test("geometry: faces", () => {
  assert.equal(faces("A2", "B2"), true);
  assert.equal(faces("A1", "B2"), false);
  assert.equal(faces("A1", "A1"), false);
});

test("geometry: end four vs six", () => {
  const four = seatsForLayout("4");
  const six = seatsForLayout("6");
  assert.equal(isEnd("A1", four), true);
  assert.equal(isEnd("A2", four), true);
  assert.equal(isEnd("B1", four), true);
  assert.equal(isEnd("B2", four), true);
  assert.equal(isEnd("A1", six), true);
  assert.equal(isEnd("A2", six), false);
  assert.equal(isEnd("A3", six), true);
  assert.equal(isEnd("B1", six), true);
  assert.equal(isEnd("B2", six), false);
  assert.equal(isEnd("B3", six), true);
});

test("partial: unseated is PENDING not CONFLICT", () => {
  const level = loadLevel("l01");
  const asg = { fox: null, rabbit: "A2", crane: "B1", otter: "B2" };
  const statuses = Object.fromEntries(
    evaluateLevel(level, asg).map((r) => [r.id, r.status]),
  );
  assert.equal(statuses["L01-r1"], PENDING);
  assert.equal(statuses["L01-r3"], PENDING);
  assert.equal(statuses["L01-r2"], SATISFIED);
});

test("partial: not_beside CONFLICT when both seated", () => {
  const level = loadLevel("l01");
  const asg = { fox: "A1", rabbit: "A2", crane: "B1", otter: "B2" };
  assert.equal(
    evaluateRule(level.rules[2], asg, { availableSeats: level.seats }),
    CONFLICT,
  );
});

test("validation: illegal id and duplicate seat", () => {
  const level = loadLevel("l01");
  const errs = validateAssignment(
    { fox: "A1", ghost: "A2" },
    { characters: level.characters, availableSeats: level.seats },
  );
  assert.ok(errs.some((e) => e.includes("illegal character")));

  const errs2 = validateAssignment(
    { fox: "A1", rabbit: "A1", crane: "B1", otter: "B2" },
    { characters: level.characters, availableSeats: level.seats },
  );
  assert.ok(errs2.some((e) => e.includes("duplicate seat")));
});

test("validation: illegal seat", () => {
  const level = loadLevel("l01");
  const errs = validateAssignment(
    { fox: "A3", rabbit: "A2", crane: "B1", otter: "B2" },
    { characters: level.characters, availableSeats: level.seats },
  );
  assert.ok(errs.some((e) => e.includes("not available")));
});

test("L01 known solution wins + enumerate 24→1", () => {
  const level = loadLevel("l01");
  assert.equal(isWin(level, level.known_solution), true);
  const [n, total] = countSolutions(level);
  assert.equal(total, 24);
  assert.equal(n, 1);
  assert.deepEqual(enumerateSolutions(level)[0], level.known_solution);
});

test("L02 known solution wins + enumerate 720→1", () => {
  const level = loadLevel("l02");
  assert.equal(isWin(level, level.known_solution), true);
  const [n, total] = countSolutions(level);
  assert.equal(total, 720);
  assert.equal(n, 1);
  assert.deepEqual(enumerateSolutions(level)[0], level.known_solution);
});

test("L03 calm cases", () => {
  const level = loadLevel("l03");
  {
    const [n, total] = countSolutions(level, { calm: new Set() });
    assert.equal(total, 720);
    assert.equal(n, 0);
  }
  {
    const [n, total] = countSolutions(level, { calm: new Set(["rabbit"]) });
    assert.equal(total, 720);
    assert.equal(n, 1);
    assert.deepEqual(
      enumerateSolutions(level, { calm: new Set(["rabbit"]) })[0],
      level.known_solution_with_calm_rabbit,
    );
    assert.equal(
      isWin(level, level.known_solution_with_calm_rabbit, {
        calm: new Set(["rabbit"]),
      }),
      true,
    );
  }
  for (const cid of ["fox", "crane", "otter", "tanuki", "hedgehog"]) {
    const [n] = countSolutions(level, { calm: new Set([cid]) });
    assert.equal(n, 0, `calm on ${cid} should still be 0 solutions`);
  }
  const bad = {
    fox: "A2",
    otter: "A1",
    hedgehog: "A3",
    rabbit: "B1",
    crane: "B2",
    tanuki: "B3",
  };
  assert.equal(isWin(level, bad, { calm: new Set(["rabbit"]) }), false);
});

test("anti-1: L01 + calm={rabbit} must NOT win (no props)", () => {
  const level = loadLevel("l01");
  assert.equal(
    isWin(level, level.known_solution, { calm: new Set(["rabbit"]) }),
    false,
  );
  const { errors } = resolveEffectiveCalm(level, new Set(["rabbit"]));
  assert.ok(errors.length > 0);
});

test("anti-2: L03 sol + calm={rabbit,fox} must NOT win", () => {
  const level = loadLevel("l03");
  assert.equal(
    isWin(level, level.known_solution_with_calm_rabbit, {
      calm: new Set(["rabbit", "fox"]),
    }),
    false,
  );
  const { errors } = resolveEffectiveCalm(level, new Set(["rabbit", "fox"]));
  assert.ok(errors.length > 0);
});

test("anti-3: L03 initial_calm=['rabbit','ghost'] must NOT win", () => {
  const level = clone(loadLevel("l03"));
  level.initial_calm = ["rabbit", "ghost"];
  const errs = validateLevel(level);
  assert.ok(errs.some((e) => e.includes("unknown character") || e.includes("ghost")));
  assert.equal(
    isWin(level, level.known_solution_with_calm_rabbit),
    false,
  );
});

test("anti-4: duplicate rule id must reject (not overwrite)", () => {
  const level = clone(loadLevel("l01"));
  level.rules.push({
    id: "L01-r1",
    kind: "at",
    subject: "fox",
    seat: "B2",
  });
  const errs = validateLevel(level);
  assert.ok(errs.some((e) => e.includes("duplicate rule id")));
  assert.equal(isWin(level, level.known_solution), false);
  // even if someone bypassed validateLevel, list eval would see CONFLICT on 2nd L01-r1
  const results = evaluateLevel(level, level.known_solution);
  assert.equal(results.length, 4);
  assert.ok(results.some((r) => r.id === "L01-r1" && r.status === CONFLICT));
});

test("anti-5: duplicate seat in level.seats must reject", () => {
  const level = clone(loadLevel("l01"));
  level.seats = [...level.seats, "A1"];
  const errs = validateLevel(level);
  assert.ok(errs.some((e) => e.includes("duplicate seat")));
  assert.equal(isWin(level, level.known_solution), false);
});

test("missing-ref: rule subject not in characters", () => {
  const level = clone(loadLevel("l01"));
  level.rules[0].subject = "ghost";
  const errs = validateLevel(level);
  assert.ok(errs.some((e) => e.includes("subject not in characters")));
});

test("missing-ref: rule other not in characters", () => {
  const level = clone(loadLevel("l01"));
  level.rules[2].other = "ghost";
  const errs = validateLevel(level);
  assert.ok(errs.some((e) => e.includes("other not in characters")));
});

test("missing-ref: at-seat not available", () => {
  const level = clone(loadLevel("l01"));
  level.rules[0].seat = "A9";
  const errs = validateLevel(level);
  assert.ok(errs.some((e) => e.includes("seat not available")));
});

test("levels json roundtrip", () => {
  for (const name of ["l01", "l02", "l03"]) {
    const data = JSON.parse(
      fs.readFileSync(path.join(ROOT, "levels", `${name}.json`), "utf8"),
    );
    assert.ok(data.rules);
    assert.ok(data.characters);
    assert.equal(validateLevel(data).length, 0);
  }
});
