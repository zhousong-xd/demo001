/**
 * T-003 staged-A canary probe (SOURCE ONLY — 本阶段未执行).
 *
 * Proves filesystem isolation with three checks:
 *   1) Outside canary exists & is readable on the HOST (launcher prepares it).
 *      Inside isolation that same host path must be UNREADABLE.
 *   2) Positive read of an allowlisted path succeeds inside isolation.
 *   3) Isolation/marker/token mismatch => non-zero exit (no fallback).
 *
 * Does NOT read real credentials, PAT files, or GH tokens.
 * Invoke ONLY via: bash .../isolated-launcher.sh canary-probe
 */
import { readFileSync, accessSync, constants, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function fail(msg, code = 1) {
  console.error(`CANARY_FAIL: ${msg}`);
  process.exit(code);
}

function requireIsolation() {
  if (process.env.BANQUET_EVIDENCE_ISOLATED !== "1") {
    fail(
      "REFUSE: not isolated. Invoke via isolated-launcher.sh (BANQUET_EVIDENCE_ISOLATED=1). No bare/host fallback.",
      2,
    );
  }
  const marker = process.env.BANQUET_ISOLATION_MARKER;
  const token = process.env.BANQUET_INSTANCE_TOKEN;
  if (!marker || !token) fail("missing BANQUET_ISOLATION_MARKER or BANQUET_INSTANCE_TOKEN", 2);
  let got;
  try {
    got = readFileSync(marker, "utf8").trim();
  } catch (e) {
    fail(`marker unreadable: ${marker}: ${e.message}`, 2);
  }
  if (got !== token.trim()) fail("instance marker/token mismatch", 2);
}

function assertUnreadable(p, label) {
  if (!p) fail(`${label}: path not set`);
  let readable = false;
  try {
    accessSync(p, constants.R_OK);
    readFileSync(p, "utf8");
    readable = true;
  } catch {
    readable = false;
  }
  if (readable) {
    fail(
      `${label}: canary STILL readable inside isolation at ${p} — isolation broken (missing-path-fails is NOT enough; this path was prepared outside and must be denied)`,
    );
  }
  console.log(`OK deny: ${label} unreadable inside isolation (${p})`);
}

function assertReadable(p, label) {
  if (!p || !existsSync(p)) fail(`${label}: allowed path missing: ${p}`);
  let data;
  try {
    data = readFileSync(p, "utf8");
  } catch (e) {
    fail(`${label}: allowed path unreadable: ${p}: ${e.message}`);
  }
  if (!data || data.length < 1) fail(`${label}: allowed path empty: ${p}`);
  console.log(`OK allow: ${label} readable (${p}, ${data.length} bytes)`);
  return data;
}

function main() {
  requireIsolation();

  // Positive allowlisted read (task source RO mount)
  const taskRoot = process.env.BANQUET_TASK_ROOT;
  if (!taskRoot) fail("BANQUET_TASK_ROOT unset");
  const allowed = path.join(taskRoot, "tests/evidence/scripts/canary-probe.mjs");
  assertReadable(allowed, "allowlisted-self");

  // Also confirm evidence out is writable path exists
  const evid = process.env.BANQUET_EVIDENCE_OUT;
  if (!evid) fail("BANQUET_EVIDENCE_OUT unset");
  assertReadable(path.join(evid, "scripts/canary-probe.mjs"), "evidence-out-bind");

  // Outside canary must be denied inside (host path not in mount allowlist)
  const canaryOutside = process.env.BANQUET_CANARY_OUTSIDE;
  assertUnreadable(canaryOutside, "outside-canary");

  // Sanity: never touch credential paths
  for (const banned of [
    "/home/box/.config/github_pat",
    process.env.HOME + "/.config/github_pat",
  ]) {
    // Only check they are not readable; do not print contents if somehow visible
    try {
      accessSync(banned, constants.R_OK);
      fail(`credential path unexpectedly readable: ${banned}`);
    } catch {
      console.log(`OK deny: credential-path-not-readable (${banned})`);
    }
  }

  console.log("CANARY_OK");
  process.exit(0);
}

main();
