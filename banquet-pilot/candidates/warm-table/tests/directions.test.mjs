import test from "node:test";
import assert from "node:assert/strict";
import { VIEW_DIRECTIONS, seatFacing, vectorFacing, gazeFacing, tableRoute } from "../directions.mjs";

test("eight directional vectors map to eight discrete views", () => {
  const vectors = [[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1],[1,0],[1,1]];
  assert.deepEqual(vectors.map(([deltaX,deltaY]) => vectorFacing(deltaX,deltaY)), VIEW_DIRECTIONS);
});
test("body facing comes only from seat row", () => {
  assert.equal(seatFacing("A1"), "S"); assert.equal(seatFacing("A2"), "S");
  assert.equal(seatFacing("B1"), "N"); assert.equal(seatFacing("B2"), "N"); assert.equal(seatFacing(null), "S");
});
test("head turns are bounded and wrap across compass origin", () => {
  assert.equal(gazeFacing("S", "N"), "SE"); assert.equal(gazeFacing("N", "E"), "NE");
  assert.equal(gazeFacing("N", "E", 2), "E"); assert.equal(gazeFacing("S", "S"), "S");
  assert.equal(gazeFacing("SE", "SW"), "S");
});
test("same-row routes stay outside dining surface", () => {
  for (const [from,to] of [[[112,165],[308,165]],[[112,341],[308,341]]]) {
    const route = tableRoute(from,to); assert.deepEqual(route[0],from); assert.deepEqual(route.at(-1),to);
    assert.ok(route[1][1] < 150 || route[1][1] > 277); assert.equal(route[1][1],route[2][1]);
  }
});
test("cross-row routes use table side and different passing lanes", () => {
  const first = tableRoute([112,165],[112,341]); const second = tableRoute([112,341],[112,165],1);
  assert.ok(first[1][0] < 70); assert.ok(second[1][0] < 70); assert.notEqual(first[1][0],second[1][0]);
  assert.ok(first[1][0] >= 59); assert.ok(second[1][0] >= 59);
  assert.equal(first[1][0],first[2][0]); assert.deepEqual(first.at(-1),[112,341]);
});
