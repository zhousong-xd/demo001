import test from "node:test";
import assert from "node:assert/strict";
import { createWarmTable, WARM_LEVEL } from "../model.mjs";
import { evaluateLevel } from "../../../src/core/rules.js";

test("sample starts with an actual not_faces_unless conflict", () => {
  const state = createWarmTable().read();
  assert.equal(state.won, false);
  assert.deepEqual(state.result.rules.map(rule => rule.status), ["SATISFIED", "CONFLICT"]);
  assert.deepEqual(state.result, evaluateLevel(WARM_LEVEL, state.assignment, { calm: state.calm }));
});
test("moving rabbit to B2 wins without a prop", () => {
  const store = createWarmTable(); store.move("rabbit", "B2");
  assert.equal(store.read().won, true); assert.equal(store.read().inventory.calm_bell, 1);
});
test("bell on rabbit allows facing and consumes exactly one", () => {
  const store = createWarmTable(); assert.equal(store.bell("rabbit").changed, true);
  assert.equal(store.read().won, true); assert.deepEqual(store.read().calm, ["rabbit"]);
  assert.equal(store.read().inventory.calm_bell, 0);
  assert.equal(store.bell("rabbit").changed, false); assert.equal(store.read().historyLength, 1);
});
test("invalid bell target does not consume or create history", () => {
  const store = createWarmTable(); const before = store.read();
  assert.equal(store.bell("fox").reason, "invalid-target"); assert.deepEqual(store.read(), before);
});
test("moving and undoing preserves character-scoped calm", () => {
  const store = createWarmTable(); store.bell("rabbit"); store.move("rabbit", "B2"); store.undo();
  assert.equal(store.read().assignment.rabbit, "B1"); assert.deepEqual(store.read().calm, ["rabbit"]);
  assert.equal(store.read().inventory.calm_bell, 0); store.undo();
  assert.deepEqual(store.read().calm, []); assert.equal(store.read().inventory.calm_bell, 1);
  assert.equal(store.read().won, false); assert.equal(store.read().moves, 0);
});
test("seated characters swap atomically, including into a conflicting state", () => {
  const store = createWarmTable(); assert.equal(store.move("rabbit", "A1").kind, "swap");
  assert.deepEqual(store.read().assignment, { fox: "B1", rabbit: "A1" });
  assert.equal(store.read().won, false); store.undo(); assert.equal(store.read().assignment.fox, "A1");
});
test("waiting guest displaces seated occupant to waiting", () => {
  const store = createWarmTable(); store.wait("rabbit");
  assert.equal(store.move("rabbit", "A1").kind, "displace");
  assert.deepEqual(store.read().assignment, { fox: null, rabbit: "A1" });
});
test("waiting is pending, not a victory", () => {
  const store = createWarmTable(); store.wait("rabbit");
  assert.equal(store.read().won, false); assert.equal(store.read().result.rules[1].status, "PENDING");
});
test("preview never mutates state or history", () => {
  const store = createWarmTable(); const before = store.read();
  assert.equal(store.preview("rabbit", "B2").won, true);
  assert.equal(store.preview("rabbit", "A1").kind, "swap");
  assert.deepEqual(store.read(), before);
});
test("reset restores seats, inventory, history and move count", () => {
  const store = createWarmTable(); store.bell("rabbit"); store.move("rabbit", "A2"); store.reset();
  assert.deepEqual(store.read(), createWarmTable().read()); assert.equal(store.undo(), false);
});
test("invalid and same-seat inputs do not create history", () => {
  const store = createWarmTable(); const before = store.read();
  for (const [character, seat] of [["rabbit", "B1"], ["ghost", "B2"], ["rabbit", "Z9"]]) assert.equal(store.move(character, seat).changed, false);
  assert.equal(store.wait("ghost").changed, false); assert.deepEqual(store.read(), before);
});
test("returned snapshots cannot mutate live state", () => {
  const store = createWarmTable(); const snapshot = store.read(); snapshot.assignment.fox = "B2";
  snapshot.inventory.calm_bell = 100; snapshot.calm.push("fox"); assert.deepEqual(store.read(), createWarmTable().read());
});
test("long rapid sequence remains bounded and fully seated without duplicate seats", () => {
  const store = createWarmTable();
  for (let index = 0; index < 150; index++) store.move("rabbit", index % 2 ? "B1" : "B2");
  assert.equal(store.read().historyLength, 100); assert.equal(new Set(Object.values(store.read().assignment)).size, 2);
  assert.equal(store.read().moves, 150);
});
