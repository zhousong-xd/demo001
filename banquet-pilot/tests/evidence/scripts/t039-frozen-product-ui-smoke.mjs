/**
 * T-039 frozen product (dist) short UI mouse-sim smoke — demo path only.
 * Covers: open dist HTML; L01 place + undo; switch L01→L02; L03 calm_bell miss+hit.
 * Does NOT modify dist/. 真机/多指: 未测.
 *
 *   cd banquet-pilot
 *   node --experimental-websocket tests/evidence/scripts/t039-frozen-product-ui-smoke.mjs
 *
 * Evidence: evidence/t039-frozen-product-ui-smoke/
 */
import { spawn } from "node:child_process";
import {
  writeFileSync, mkdirSync, readFileSync, existsSync, mkdtempSync, rmSync,
} from "node:fs";
import http from "node:http";
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const EVID = path.join(ROOT, "evidence/t039-frozen-product-ui-smoke");
const DIST = path.join(ROOT, "dist/banquet-pilot.html");
const FROZEN_SHA = "f28893f3c419d794c6ba102bac67038683cb462c";
const FROZEN_HTML_SHA256 = "19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5";
const FROZEN_BYTES = 73182;

function buildChildEnv(extra = {}) {
  const home = process.env.HOME || "/home/box";
  const tmp = process.env.TMPDIR || "/tmp";
  const env = {
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    HOME: home, TMPDIR: tmp, TMP: tmp, TEMP: tmp,
    LANG: "C.UTF-8", LC_ALL: "C.UTF-8",
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || path.join(tmp, "xdg-runtime"),
    XDG_CONFIG_HOME: path.join(tmp, "banquet-t039-xdg-config"),
    XDG_CACHE_HOME: path.join(tmp, "banquet-t039-xdg-cache"),
    XDG_DATA_HOME: path.join(tmp, "banquet-t039-xdg-data"),
  };
  for (const [k, v] of Object.entries(extra)) if (v != null) env[k] = String(v);
  for (const banned of ["GH_TOKEN","GITHUB_TOKEN","GITHUB_PAT","PAT","GH_PAT","DISPLAY","WAYLAND_DISPLAY","DBUS_SESSION_BUS_ADDRESS","XAUTHORITY"]) delete env[banned];
  return env;
}
function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const port = s.address().port;
      s.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}
function fetchJson(u) {
  return new Promise((resolve, reject) => {
    http.get(u, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => { try { resolve(JSON.parse(d)); } catch (e) { reject(e); } });
    }).on("error", reject);
  });
}
async function waitForDevtoolsEndpoint(userDataDir, maxMs = 45000) {
  const portFile = path.join(userDataDir, "DevToolsActivePort");
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      if (existsSync(portFile)) {
        const raw = readFileSync(portFile, "utf8").trim().split(/\n/);
        const port = Number(raw[0]);
        const browserPath = (raw[1] || "").trim();
        if (port > 0 && browserPath.startsWith("/devtools/browser/")) return { port, browserPath };
      }
    } catch {}
    await sleep(100);
  }
  throw new Error("DevToolsActivePort not ready");
}
async function waitForPage(cdpPort, maxMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const list = await fetchJson(`http://127.0.0.1:${cdpPort}/json/list`);
      const page = (list || []).find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await sleep(150);
  }
  throw new Error("CDP page not ready");
}
class Cdp {
  constructor(wsUrl) { this.wsUrl = wsUrl; this.id = 0; this.pending = new Map(); }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => { this.ws.addEventListener("open", () => res()); this.ws.addEventListener("error", rej); });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error("CDP timeout " + method)); } }, 20000);
    });
  }
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error("eval: " + (r.exceptionDetails.text || JSON.stringify(r.exceptionDetails)));
    return r.result?.value;
  }
  close() { try { this.ws.close(); } catch {} }
}
async function mouseClick(cdp, x, y) {
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
}
async function centerOf(cdp, selector) {
  const box = await cdp.eval(`(() => { const el=document.querySelector(${JSON.stringify(selector)}); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  if (!box) throw new Error("missing " + selector);
  return box;
}
async function clickChar(cdp, charId) {
  const b = await centerOf(cdp, `.char[data-char="${charId}"]`);
  await mouseClick(cdp, b.x, b.y); await sleep(60);
}
async function clickSeat(cdp, seat) {
  const box = await cdp.eval(`(() => { const el=document.querySelector('.seat[data-seat="${seat}"]'); if(!el) return null; const r=el.getBoundingClientRect(); return {x:r.left+r.width*0.5,y:r.top+r.height*0.75}; })()`);
  if (!box) throw new Error("missing seat " + seat);
  await mouseClick(cdp, box.x, box.y); await sleep(60);
}
async function clickUndo(cdp) {
  const pt = await cdp.eval(`(() => { const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()==='撤销'); if(!b) return null; const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; })()`);
  if (!pt) throw new Error("missing undo");
  await mouseClick(cdp, pt.x, pt.y); await sleep(80);
}
async function clickBell(cdp) {
  const pt = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').includes('安心铃'));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: b.textContent.trim() };
  })()`);
  if (!pt) throw new Error("missing calm bell");
  await mouseClick(cdp, pt.x, pt.y);
  await sleep(80);
}
async function clickLevelTab(cdp, levelId) {
  const pt = await cdp.eval(`(() => {
    const b = [...document.querySelectorAll('button')].find((x) => (x.textContent || '').trim() === ${JSON.stringify(levelId)});
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  })()`);
  if (!pt) throw new Error("missing level tab " + levelId);
  await mouseClick(cdp, pt.x, pt.y);
  await sleep(120);
}
async function waitReady(cdp, maxMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await cdp.eval(`!!window.__BANQUET__ && !!window.__BANQUET__.levelId`)) return;
    await sleep(80);
  }
  throw new Error("timeout __BANQUET__");
}
async function state(cdp) {
  return cdp.eval(`(() => ({
    levelId: __BANQUET__.levelId,
    assignment: __BANQUET__.assignment,
    calm: [...(__BANQUET__.calm||[])],
    inventory: __BANQUET__.inventory,
    historyLen: __BANQUET__.historyLen,
    won: __BANQUET__.won,
    url: location.href,
  }))()`);
}
async function shot(cdp, file) {
  const r = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(file, Buffer.from(r.data, "base64"));
}
function distProof() {
  const buf = readFileSync(DIST);
  return { bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), hasCR: buf.includes(0x0d) };
}

async function main() {
  if (!existsSync(DIST)) throw new Error("missing dist");
  mkdirSync(EVID, { recursive: true });
  mkdirSync(path.join(EVID, "shots"), { recursive: true });
  const log = [];
  const note = (s) => { log.push(s); console.log(s); };

  const before = distProof();
  writeFileSync(path.join(EVID, "dist-proof-before.txt"), JSON.stringify({ ...before, frozenProductSha: FROZEN_SHA }, null, 2) + "\n");
  if (before.bytes !== FROZEN_BYTES || before.sha256 !== FROZEN_HTML_SHA256) {
    throw new Error(`dist hash mismatch before run: ${JSON.stringify(before)}`);
  }

  const httpPort = await freePort();
  const profile = mkdtempSync(path.join(os.tmpdir(), "banquet-t039-ud-"));
  const childEnv = buildChildEnv();
  const BASE = `http://127.0.0.1:${httpPort}/dist/banquet-pilot.html`;
  const httpProc = spawn("python3", ["-m", "http.server", String(httpPort), "--bind", "127.0.0.1"], {
    cwd: ROOT, stdio: "ignore", env: childEnv,
  });
  await sleep(350);
  const chrome = spawn("google-chrome", [
    "--headless=new", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0",
    `--user-data-dir=${profile}`, "--no-first-run", "--no-default-browser-check",
    "--disable-background-networking", "--disable-sync", "--disable-extensions",
    "--metrics-recording-only", "--disable-dev-shm-usage", "--window-size=390,844", "about:blank",
  ], { env: childEnv, stdio: ["ignore", "ignore", "pipe"] });
  let chromeErr = "";
  chrome.stderr.on("data", (d) => { chromeErr += d.toString(); });

  let cdp;
  const results = [];
  try {
    const ep = await waitForDevtoolsEndpoint(profile);
    const page = await waitForPage(ep.port);
    cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

    // L01 place + undo
    await cdp.send("Page.navigate", { url: `${BASE}?level=L01` });
    await waitReady(cdp);
    await cdp.eval(`localStorage.clear()`);
    await cdp.send("Page.navigate", { url: `${BASE}?level=L01` });
    await waitReady(cdp);
    let s = await state(cdp);
    if (s.levelId !== "L01") throw new Error("not L01: " + JSON.stringify(s));
    await shot(cdp, path.join(EVID, "shots/01_L01_boot.png"));
    await clickChar(cdp, "fox");
    await clickSeat(cdp, "A1");
    s = await state(cdp);
    if (s.assignment?.fox !== "A1") throw new Error("place fail: " + JSON.stringify(s));
    await shot(cdp, path.join(EVID, "shots/02_L01_placed.png"));
    results.push({ step: "L01_place", pass: true });
    note("[PASS] L01 mouse place fox→A1");

    await clickUndo(cdp);
    s = await state(cdp);
    if (Object.values(s.assignment || {}).filter(Boolean).length !== 0) throw new Error("undo fail: " + JSON.stringify(s));
    await shot(cdp, path.join(EVID, "shots/03_L01_undo.png"));
    results.push({ step: "L01_undo", pass: true });
    note("[PASS] L01 undo");

    // switch L01 → L02 via level tab mouse click
    await clickLevelTab(cdp, "L02");
    await waitReady(cdp);
    s = await state(cdp);
    if (s.levelId !== "L02") throw new Error("switch L02 fail: " + JSON.stringify(s));
    await clickChar(cdp, "fox");
    await clickSeat(cdp, "A1");
    s = await state(cdp);
    if (s.assignment?.fox !== "A1") throw new Error("L02 place fail: " + JSON.stringify(s));
    await shot(cdp, path.join(EVID, "shots/04_L02_ok.png"));
    results.push({ step: "switch_L02_place", pass: true });
    note("[PASS] switch L01→L02 + place");

    // additional: L03 calm_bell miss + hit
    await clickLevelTab(cdp, "L03");
    await waitReady(cdp);
    s = await state(cdp);
    const stock0 = s.inventory?.calm_bell ?? 0;
    if (stock0 < 1) throw new Error("L03 no bell: " + JSON.stringify(s));
    await clickBell(cdp);
    await clickChar(cdp, "fox");
    s = await state(cdp);
    if ((s.inventory?.calm_bell ?? -1) !== stock0) throw new Error("L03 miss consumed: " + JSON.stringify(s));
    await shot(cdp, path.join(EVID, "shots/05_L03_miss.png"));
    results.push({ step: "L03_calm_miss", pass: true });
    note("[PASS] L03 calm miss fox");

    await clickBell(cdp);
    await clickChar(cdp, "rabbit");
    s = await state(cdp);
    if ((s.inventory?.calm_bell ?? -1) !== stock0 - 1 || !(s.calm || []).includes("rabbit")) {
      throw new Error("L03 hit fail: " + JSON.stringify(s));
    }
    await shot(cdp, path.join(EVID, "shots/06_L03_hit.png"));
    results.push({ step: "L03_calm_hit", pass: true });
    note("[PASS] L03 calm hit rabbit");

    note("[未测] 真机 / 多指");
    note(`open: http.server banquet-pilot/ → ${BASE} (standalone HTML; file:// also valid offline)`);
  } finally {
    try { cdp?.close(); } catch {}
    try { chrome.kill("SIGKILL"); } catch {}
    try { httpProc.kill("SIGKILL"); } catch {}
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }

  const after = distProof();
  writeFileSync(path.join(EVID, "dist-proof-after.txt"), JSON.stringify({ ...after, frozenProductSha: FROZEN_SHA }, null, 2) + "\n");
  if (after.sha256 !== before.sha256 || after.bytes !== before.bytes) throw new Error("dist changed — forbidden");
  if (after.sha256 !== FROZEN_HTML_SHA256 || after.bytes !== FROZEN_BYTES) throw new Error("post hash != frozen");

  const summary = {
    task: "T-039",
    kind: "frozen-product-ui-short-smoke",
    productSha: FROZEN_SHA,
    mouseSim: true,
    deviceUntested: true,
    open: "python3 -m http.server from banquet-pilot/; URL /dist/banquet-pilot.html?level=L01 (file:// also OK)",
    results,
    dist: after,
  };
  writeFileSync(path.join(EVID, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  writeFileSync(path.join(EVID, "full-log.txt"), log.join("\n") + "\n");
  writeFileSync(path.join(EVID, "command.txt"), "cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t039-frozen-product-ui-smoke.mjs\n");
  if (chromeErr) writeFileSync(path.join(EVID, "chrome-stderr-tail.txt"), chromeErr.slice(-3000));
  console.log(JSON.stringify({ ok: true, evid: EVID, steps: results.map((r) => r.step) }, null, 2));
}

main().catch((e) => {
  console.error("T-039 FAIL", e);
  try { mkdirSync(EVID, { recursive: true }); writeFileSync(path.join(EVID, "FAIL.txt"), String(e?.stack || e)); } catch {}
  process.exit(1);
});
