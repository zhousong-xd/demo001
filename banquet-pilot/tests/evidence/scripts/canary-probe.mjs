/**
 * T-003 staged-A canary probe (SOURCE ONLY — 本阶段未执行).
 *
 * Checks (booleans / counts / exit code only — no secrets):
 *   1) Host-prepared outside canary path is UNREADABLE inside isolation.
 *   2) Allowlisted RO path is readable (positive).
 *   3) Write to RO canary is denied; write to independent evidence-out succeeds.
 *   4) Marker/token mismatch => non-zero (no fallback).
 *
 * Does NOT probe real credential paths. Invoke ONLY via isolated-launcher.sh.
 */
import { readFileSync, writeFileSync, accessSync, constants, existsSync, unlinkSync } from "node:fs";
import path from "node:path";

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
    fail(`${label}: still readable inside isolation (${p})`);
  }
  console.log(`OK deny_read: ${label}`);
}

function assertReadable(p, label) {
  if (!p || !existsSync(p)) fail(`${label}: allowed path missing`);
  let data;
  try {
    data = readFileSync(p, "utf8");
  } catch (e) {
    fail(`${label}: allowed path unreadable: ${e.message}`);
  }
  if (!data || data.length < 1) fail(`${label}: allowed path empty`);
  console.log(`OK allow_read: ${label} bytes=${data.length}`);
  return data;
}

function assertWriteDenied(p, label) {
  if (!p) fail(`${label}: path not set`);
  let wrote = false;
  try {
    writeFileSync(p, "canary-write-should-fail\n");
    wrote = true;
  } catch {
    wrote = false;
  }
  if (wrote) {
    try {
      unlinkSync(p);
    } catch {
      /* ignore */
    }
    fail(`${label}: write unexpectedly succeeded (${p})`);
  }
  console.log(`OK deny_write: ${label}`);
}

function assertWriteAllowed(dir, label) {
  if (!dir) fail(`${label}: dir not set`);
  const p = path.join(dir, `canary-write-${process.pid}.ok`);
  try {
    writeFileSync(p, "ok\n");
  } catch (e) {
    fail(`${label}: write failed: ${e.message}`);
  }
  if (!existsSync(p)) fail(`${label}: write missing after create`);
  try {
    unlinkSync(p);
  } catch {
    /* leave file if unlink fails — still counted success */
  }
  console.log(`OK allow_write: ${label}`);
}

function main() {
  requireIsolation();

  const taskRoot = process.env.BANQUET_TASK_ROOT;
  if (!taskRoot) fail("BANQUET_TASK_ROOT unset");
  const scriptsDir = process.env.BANQUET_SCRIPTS_DIR || path.join(taskRoot, "tests/evidence/scripts");
  assertReadable(path.join(scriptsDir, "canary-probe.mjs"), "allowlisted-self");

  const canaryRo = process.env.BANQUET_CANARY_RO;
  assertReadable(canaryRo, "ro-canary");
  assertWriteDenied(canaryRo, "ro-canary");

  // Do not attempt writes against production game source under task root.
  assertWriteDenied(path.join(scriptsDir, ".canary-write-should-fail"), "scripts-ro");

  const evid = process.env.BANQUET_EVIDENCE_OUT;
  if (!evid) fail("BANQUET_EVIDENCE_OUT unset");
  assertWriteAllowed(evid, "evidence-out");

  const canaryOutside = process.env.BANQUET_CANARY_OUTSIDE;
  assertUnreadable(canaryOutside, "outside-canary");

  console.log("CANARY_OK checks=5");
  process.exit(0);
}

main();
