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

function report(stem, label, calm) {
  const data = loadCandidate(stem);
  const tag = label || data.id || stem.toUpperCase();
  const opts = calm !== undefined ? { calm } : {};
  const [n, t] = countSolutions(data, opts);
  console.log(`${tag}: ${t} perms → ${n} solution(s)`);
  for (const s of enumerateSolutions(data, opts)) console.log(`  ${JSON.stringify(s)}`);
  return [n, t];
}

console.log("=== Banquet Pilot candidate enumeration (JS, candidates/levels only) ===");
console.log(`dir: ${__dirname}`);

report("c01");
report("c02");

{
  const c03 = loadCandidate("c03");
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

report("c04");
report("c05");
report("c06");

{
  const c07 = loadCandidate("c07");
  const [n0, t0] = countSolutions(c07, { calm: new Set() });
  console.log(`C07 no calm: ${t0} perms → ${n0} solution(s)`);
  for (const cid of ["rabbit", "tanuki", "fox", "crane", "otter", "hedgehog"]) {
    const [n, t] = countSolutions(c07, { calm: new Set([cid]) });
    console.log(`C07 calm ${cid}: ${t} perms → ${n} solution(s)`);
    if (n > 0 && (cid === "rabbit" || cid === "tanuki")) {
      for (const s of enumerateSolutions(c07, { calm: new Set([cid]) })) {
        console.log(`  ${JSON.stringify(s)}`);
      }
    }
  }
}

report("c08");
report("c09");
