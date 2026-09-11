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
  validatePlayable,
} from "../src/core/rules.js";
import { loadLevel } from "../src/core/loader.js";
import { countSolutions, enumerateSolutions } from "../src/core/solver.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORE = path.join(ROOT, "src", "core");

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
  const result = evaluateLevel(level, asg);
  assert.equal(result.ok, true);
  const statuses = Object.fromEntries(result.rules.map((r) => [r.id, r.status]));
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

test("partial: null/undefined/empty string all mean unseated", () => {
  const level = loadLevel("l01");
  for (const empty of [null, undefined, ""]) {
    const asg = { fox: empty, rabbit: "A2", crane: "B1", otter: "B2" };
    const result = evaluateLevel(level, asg);
    assert.equal(result.ok, true, `empty=${JSON.stringify(empty)}`);
    assert.equal(isWin(level, asg), false);
    const statuses = Object.fromEntries(result.rules.map((r) => [r.id, r.status]));
    assert.equal(statuses["L01-r1"], PENDING);
  }
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
  const winEval = evaluateLevel(level, level.known_solution);
  assert.equal(winEval.ok, true);
  assert.ok(winEval.rules.every((r) => r.status === SATISFIED));
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
  const ev = evaluateLevel(level, level.known_solution, {
    calm: new Set(["rabbit"]),
  });
  assert.equal(ev.ok, false);
  assert.deepEqual(ev.rules, []);
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
  // illegal config → structured fail, empty rules (no per-rule CONFLICT list)
  const results = evaluateLevel(level, level.known_solution);
  assert.equal(results.ok, false);
  assert.ok(results.errors.some((e) => e.includes("duplicate rule id")));
  assert.deepEqual(results.rules, []);
});

test("anti-5: duplicate seat in level.seats must reject", () => {
  const level = clone(loadLevel("l01"));
  level.seats = [...level.seats, "A1"];
  const errs = validateLevel(level);
  assert.ok(errs.some((e) => e.includes("duplicate seat")));
  assert.equal(isWin(level, level.known_solution), false);
});

test("GPT01 R1: L03 sol + calm=[rabbit,fox] → evaluateLevel ok false, rules empty", () => {
  const level = loadLevel("l03");
  const r1 = evaluateLevel(level, level.known_solution_with_calm_rabbit, {
    calm: ["rabbit", "fox"],
  });
  assert.equal(r1.ok, false);
  assert.deepEqual(r1.rules, []);
  assert.equal(
    isWin(level, level.known_solution_with_calm_rabbit, {
      calm: ["rabbit", "fox"],
    }),
    false,
  );
  // must NOT look like all-SATISFIED legal board
  assert.equal(r1.rules.every?.((x) => x.status === SATISFIED), true); // vacuously true on []
  assert.ok(r1.rules.length === 0);
});

test("GPT01 R2: L01 delete not_beside.other → validateLevel non-empty", () => {
  const missing = clone(loadLevel("l01"));
  delete missing.rules[2].other;
  const errs = validateLevel(missing);
  assert.ok(errs.length > 0);
  assert.ok(errs.some((e) => e.includes("other")));
});

test("GPT01 R3: L03 stock='invalid' + rabbit calm → isWin false", () => {
  const stock = clone(loadLevel("l03"));
  stock.props[0].stock = "invalid";
  assert.ok(validateLevel(stock).length > 0);
  assert.equal(
    isWin(stock, stock.known_solution_with_calm_rabbit, { calm: ["rabbit"] }),
    false,
  );
  const { errors } = resolveEffectiveCalm(stock, ["rabbit"]);
  assert.ok(errors.some((e) => e.includes("stock")));
});

test("GPT01 R4: L01 + not_faces_unless unless_state:'sleepy' → fail", () => {
  const unknown = clone(loadLevel("l01"));
  unknown.rules.push({
    id: "invalid-state",
    kind: "not_faces_unless",
    subject: "rabbit",
    other: "fox",
    unless_state: "sleepy",
  });
  assert.ok(validateLevel(unknown).length > 0);
  assert.equal(isWin(unknown, unknown.known_solution), false);
});

test("GPT01 R5: L03 valid_targets include 'ghost' → validateLevel errors", () => {
  const target = clone(loadLevel("l03"));
  target.props[0].valid_targets.push("ghost");
  const errs = validateLevel(target);
  assert.ok(errs.length > 0);
  assert.ok(errs.some((e) => e.includes("ghost")));
  assert.equal(
    isWin(target, target.known_solution_with_calm_rabbit, { calm: ["rabbit"] }),
    false,
  );
});

test("not_faces_unless: missing unless_state OK; explicit null/'' reject", () => {
  const base = clone(loadLevel("l01"));
  // missing field — OK
  base.rules.push({
    id: "ok-default-calm",
    kind: "not_faces_unless",
    subject: "rabbit",
    other: "fox",
  });
  assert.equal(validateLevel(base).length, 0);

  const withNull = clone(loadLevel("l01"));
  withNull.rules.push({
    id: "bad-null",
    kind: "not_faces_unless",
    subject: "rabbit",
    other: "fox",
    unless_state: null,
  });
  assert.ok(validateLevel(withNull).some((e) => e.includes("unless_state")));

  const withEmpty = clone(loadLevel("l01"));
  withEmpty.rules.push({
    id: "bad-empty",
    kind: "not_faces_unless",
    subject: "rabbit",
    other: "fox",
    unless_state: "",
  });
  assert.ok(validateLevel(withEmpty).some((e) => e.includes("unless_state")));
});

test("validatePlayable combines level+calm+assignment", () => {
  const level = loadLevel("l01");
  const ok = validatePlayable(level, level.known_solution);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.errors, []);

  const bad = validatePlayable(level, level.known_solution, {
    calm: ["rabbit"],
  });
  assert.equal(bad.ok, false);
  assert.ok(bad.errors.length > 0);
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

test("module-graph: index.js has zero node: imports", () => {
  const visited = new Set();
  /** @type {string[]} */
  const queue = [path.join(CORE, "index.js")];
  const nodeImports = [];

  while (queue.length > 0) {
    const file = queue.pop();
    if (visited.has(file)) continue;
    visited.add(file);
    const src = fs.readFileSync(file, "utf8");
    const re = /(?:from|import)\s+["']([^"']+)["']/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const spec = m[1];
      if (spec.startsWith("node:")) {
        nodeImports.push(`${path.relative(CORE, file)} → ${spec}`);
        continue;
      }
      if (spec.startsWith(".")) {
        let next = path.resolve(path.dirname(file), spec);
        if (!next.endsWith(".js")) next += ".js";
        if (next.startsWith(CORE) && !visited.has(next)) queue.push(next);
      }
    }
  }

  assert.ok(visited.has(path.join(CORE, "index.js")));
  assert.ok(visited.has(path.join(CORE, "rules.js")));
  assert.ok(visited.has(path.join(CORE, "geometry.js")));
  assert.ok(
    !visited.has(path.join(CORE, "loader.js")),
    "loader.js must not be in browser module graph",
  );
  assert.deepEqual(nodeImports, [], `unexpected node: imports: ${nodeImports.join(", ")}`);
});
