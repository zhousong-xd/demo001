/** Static solver summary for L01/L02/L03 (acceptance numbers). */

import { loadLevel } from "../src/core/loader.js";
import { countSolutions, enumerateSolutions } from "../src/core/solver.js";

console.log("=== Banquet Pilot static enumeration (JS) ===");

const l01 = loadLevel("l01");
{
  const [n, t] = countSolutions(l01);
  console.log(`L01: ${t} perms → ${n} solution(s)`);
  for (const s of enumerateSolutions(l01)) console.log(`  ${JSON.stringify(s)}`);
}

const l02 = loadLevel("l02");
{
  const [n, t] = countSolutions(l02);
  console.log(`L02: ${t} perms → ${n} solution(s)`);
  for (const s of enumerateSolutions(l02)) console.log(`  ${JSON.stringify(s)}`);
}

const l03 = loadLevel("l03");
{
  const [n0, t0] = countSolutions(l03, { calm: new Set() });
  console.log(`L03 no calm: ${t0} perms → ${n0} solution(s)`);
  const [n1, t1] = countSolutions(l03, { calm: new Set(["rabbit"]) });
  console.log(`L03 calm rabbit: ${t1} perms → ${n1} solution(s)`);
  for (const s of enumerateSolutions(l03, { calm: new Set(["rabbit"]) })) {
    console.log(`  ${JSON.stringify(s)}`);
  }
  for (const cid of ["fox", "crane", "otter", "tanuki", "hedgehog"]) {
    const [n] = countSolutions(l03, { calm: new Set([cid]) });
    console.log(`L03 calm ${cid}: ${n} solution(s)`);
  }
}
