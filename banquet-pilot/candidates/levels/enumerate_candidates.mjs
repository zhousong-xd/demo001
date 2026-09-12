/** Enumerate candidate JSON under candidates/levels/ only (no product levels/). */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateLevel } from "../../src/core/rules.js";
import { countSolutions, enumerateSolutions } from "../../src/core/solver.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadCandidate(stem) {
  const filePath = path.join(__dirname, `${stem}.json`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const errors = validateLevel(data);
  if (errors.length > 0) {
    throw new Error(`invalid candidate ${data.id || stem}: ${errors.join("; ")}`);
  }
  return data;
}

console.log("=== Banquet Pilot candidate enumeration (JS, candidates/levels only) ===");
console.log(`dir: ${__dirname}`);

const c01 = loadCandidate("c01");
{
  const [n, t] = countSolutions(c01);
  console.log(`C01: ${t} perms → ${n} solution(s)`);
  for (const s of enumerateSolutions(c01)) console.log(`  ${JSON.stringify(s)}`);
}

const c02 = loadCandidate("c02");
{
  const [n, t] = countSolutions(c02);
  console.log(`C02: ${t} perms → ${n} solution(s)`);
  for (const s of enumerateSolutions(c02)) console.log(`  ${JSON.stringify(s)}`);
}

const c03 = loadCandidate("c03");
{
  const [n0, t0] = countSolutions(c03, { calm: new Set() });
  console.log(`C03 no calm: ${t0} perms → ${n0} solution(s)`);
  const [n1, t1] = countSolutions(c03, { calm: new Set(["rabbit"]) });
  console.log(`C03 calm rabbit: ${t1} perms → ${n1} solution(s)`);
  for (const s of enumerateSolutions(c03, { calm: new Set(["rabbit"]) })) {
    console.log(`  ${JSON.stringify(s)}`);
  }
  for (const cid of ["fox", "crane", "otter", "tanuki", "hedgehog"]) {
    const [n] = countSolutions(c03, { calm: new Set([cid]) });
    console.log(`C03 calm ${cid}: ${n} solution(s)`);
  }
}
