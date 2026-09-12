/**
 * T-048 candidates playtest UI mouse-sim smoke (CDP Input.dispatchMouseEvent).
 * Sample UI short smoke: c05/c08/c11 place+undo (mouse-sim).
 * 真机 / 多指: 未测 — CDP ≠ 真机.
 *
 * Run from banquet-pilot/:
 *   node --experimental-websocket tests/evidence/scripts/t048-playtest-ui-sample-c05-c08-c11.mjs
 *
 * Evidence: evidence/t048-playtest-ui-sample-c05-c08-c11/
 * Does not modify frozen dist/. Keeps kernel smoke.mjs unchanged.
 */
import { spawn } from "node:child_process";
import {
  writeFileSync,
  mkdirSync,
  rmSync,
  readFileSync,
  existsSync,
  mkdtempSync,
} from "node:fs";
import http from "node:http";
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { createHash } from "node:crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../.."); // banquet-pilot
const EVID = path.join(ROOT, "evidence/t048-playtest-ui-sample-c05-c08-c11");
const DIST = path.join(ROOT, "dist/banquet-pilot.html");

function buildChildEnv(extra = {}) {
  const home = process.env.HOME || "/home/box";
  const tmp = process.env.TMPDIR || "/tmp";
  const env = {
    PATH: "/usr/bin:/bin:/usr/sbin:/sbin",
    HOME: home,
    TMPDIR: tmp,
    TMP: tmp,
    TEMP: tmp,
    LANG: "C.UTF-8",
    LC_ALL: "C.UTF-8",
    XDG_RUNTIME_DIR: process.env.XDG_RUNTIME_DIR || path.join(tmp, "xdg-runtime"),
    XDG_CONFIG_HOME: path.join(tmp, "banquet-t048-xdg-config"),
    XDG_CACHE_HOME: path.join(tmp, "banquet-t048-xdg-cache"),
    XDG_DATA_HOME: path.join(tmp, "banquet-t048-xdg-data"),
  };
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== null) env[k] = String(v);
  }
  for (const banned of [
    "GH_TOKEN", "GITHUB_TOKEN", "GITHUB_PAT", "PAT", "GH_PAT",
    "DISPLAY", "WAYLAND_DISPLAY", "DBUS_SESSION_BUS_ADDRESS", "XAUTHORITY",
  ]) delete env[banned];
  return env;
}

function freePort() {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.unref();
    s.on("error", reject);
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address();
      const port = typeof addr === "object" && addr ? addr.port : 0;
      s.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function fetchJson(u) {
  return new Promise((resolve, reject) => {
    http.get(u, (res) => {
      let d = "";
      res.on("data", (c) => (d += c));
      res.on("end", () => {
        try { resolve(JSON.parse(d)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function waitForDevtoolsEndpoint(userDataDir, maxMs = 30000) {
  const portFile = path.join(userDataDir, "DevToolsActivePort");
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      if (existsSync(portFile)) {
        const raw = readFileSync(portFile, "utf8").trim().split(/\n/);
        const port = Number(raw[0]);
        const browserPath = (raw[1] || "").trim();
        if (port > 0 && browserPath.startsWith("/devtools/browser/")) {
          return { port, browserPath };
        }
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
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.pageErrors = [];
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.addEventListener("open", () => res());
      this.ws.addEventListener("error", (e) => rej(e));
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
      if (msg.method === "Runtime.exceptionThrown") {
        this.pageErrors.push(msg.params.exceptionDetails?.text || "ex");
      }
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
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 20000);
    });
  }
  async eval(expression) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error("eval: " + (r.exceptionDetails.text || JSON.stringify(r.exceptionDetails)));
    }
    return r.result?.value;
  }
  close() {
    try { this.ws.close(); } catch {}
  }
}

async function mouseClick(cdp, x, y) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed", x, y, button: "left", clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x, y, button: "left", clickCount: 1,
  });
}

async function centerOf(cdp, selector) {
  const box = await cdp.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, w: r.width, h: r.height };
  })()`);
  if (!box) throw new Error("missing " + selector);
  return box;
}

async function clickChar(cdp, charId) {
  const b = await centerOf(cdp, `.waiting .char[data-char="${charId}"], .char[data-char="${charId}"]`);
  await mouseClick(cdp, b.x, b.y);
  await sleep(60);
}

async function clickSeat(cdp, seat) {
  const pt = await cdp.eval(`(() => {
    const el = document.querySelector('.seat[data-seat=${JSON.stringify(seat)}]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + 8, y: r.top + 8 };
  })()`);
  if (!pt) throw new Error("missing seat " + seat);
  await mouseClick(cdp, pt.x, pt.y);
  await sleep(60);
}

async function clickUndo(cdp) {
  const pt = await cdp.eval(`(() => {
    const btns = [...document.querySelectorAll('button.btn')];
    const b = btns.find((x) => (x.textContent || '').trim() === '撤销');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  })()`);
  if (!pt) throw new Error("missing undo button");
  await mouseClick(cdp, pt.x, pt.y);
  await sleep(80);
}

async function switchCandidateMouse(cdp, id) {
  // Focus select via mouse, then change value with keyboard (headless <select> dropdown is unreliable).
  const sel = await centerOf(cdp, ".cand-pick select");
  await mouseClick(cdp, sel.x, sel.y);
  await sleep(40);
  const idx = await cdp.eval(`([...document.querySelector('.cand-pick select').options].findIndex(o => o.value === ${JSON.stringify(id)}))`);
  if (idx < 0) throw new Error("no option " + id);
  // Move selection with arrows from current index
  const cur = await cdp.eval(`document.querySelector('.cand-pick select').selectedIndex`);
  const steps = idx - cur;
  const key = steps >= 0 ? "ArrowDown" : "ArrowUp";
  for (let i = 0; i < Math.abs(steps); i++) {
    await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key, code: key, windowsVirtualKeyCode: steps >= 0 ? 40 : 38 });
    await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: steps >= 0 ? 40 : 38 });
    await sleep(30);
  }
  // Ensure change fires even if headless select ignored keys: set + Event after mouse focus
  await cdp.eval(`(() => {
    const s = document.querySelector('.cand-pick select');
    s.value = ${JSON.stringify(id)};
    s.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await sleep(200);
}

async function waitPlaytest(cdp, maxMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const ok = await cdp.eval(`!!(window.__CANDIDATE_PLAYTEST__ && window.__CANDIDATE_PLAYTEST__.levelId)`);
    if (ok) return;
    await sleep(100);
  }
  const app = await cdp.eval(`document.getElementById('app')?.textContent?.slice(0,200)`);
  throw new Error("playtest not ready: " + app);
}

function snap(cdp) {
  return cdp.eval(`(() => {
    const p = window.__CANDIDATE_PLAYTEST__;
    if (!p) return null;
    return {
      fileId: p.fileId,
      levelId: p.levelId,
      title: p.title,
      assignment: p.assignment,
      calm: p.calm,
      inventory: p.inventory,
      historyLen: p.historyLen,
      seated: Object.values(p.assignment || {}).filter(Boolean).length,
      url: location.search,
      hasStatus: !!document.querySelector('#status-line'),
      status: document.querySelector('#status-line')?.textContent || '',
      message: document.querySelector('.storage-msg')?.textContent || '',
      shippedClaim: p.shippedClaim,
    };
  })()`);
}

async function clickBellButton(cdp) {
  const pt = await cdp.eval(`(() => {
    const btns = [...document.querySelectorAll('button.btn')];
    const b = btns.find((x) => /安心铃/.test((x.textContent || '').trim()));
    if (!b) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, text: b.textContent };
  })()`);
  if (!pt) throw new Error("missing calm bell button");
  await mouseClick(cdp, pt.x, pt.y);
  await sleep(80);
  return pt;
}


async function screenshot(cdp, filePath) {
  const r = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(filePath, Buffer.from(r.data, "base64"));
}

function distProof() {
  const buf = readFileSync(DIST);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  return {
    bytes: buf.length,
    sha256,
    hasCR: buf.includes(0x0d),
  };
}

async function main() {
  mkdirSync(EVID, { recursive: true });
  mkdirSync(path.join(EVID, "shots"), { recursive: true });
  const log = [];
  const note = (s) => { log.push(s); console.log(s); };

  const before = distProof();
  writeFileSync(path.join(EVID, "dist-proof-before.txt"), JSON.stringify(before, null, 2) + "\n");

  const httpPort = await freePort();
  const userDataDir = mkdtempSync(path.join(os.tmpdir(), "banquet-t048-chrome-"));
  const childEnv = buildChildEnv();

  const httpProc = spawn("python3", ["-m", "http.server", String(httpPort), "--bind", "127.0.0.1"], {
    cwd: ROOT,
    env: childEnv,
    stdio: "ignore",
  });
  await sleep(400);

  const chromeArgs = [
    "--headless=new",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${userDataDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-extensions",
    "--metrics-recording-only",
    "--disable-dev-shm-usage",
    "--window-size=420,900",
    "about:blank",
  ];
  const chrome = spawn("google-chrome", chromeArgs, {
    env: childEnv,
    stdio: ["ignore", "ignore", "pipe"],
  });

  let chromeErr = "";
  chrome.stderr.on("data", (d) => { chromeErr += d.toString(); });
  let chromeExit = null;
  chrome.on("exit", (code, signal) => { chromeExit = { code, signal }; });
  const chromeExitEarly = () => chromeExit != null;

  let cdp;
  const results = [];
  const samples = ["c05", "c08", "c11"];
  try {
    const ep = await waitForDevtoolsEndpoint(userDataDir, 45000);
    if (chromeExitEarly()) throw new Error("chrome exited early: " + chromeErr.slice(-800));
    const page = await waitForPage(ep.port);
    cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });
    const base = `http://127.0.0.1:${httpPort}/candidates/playtest/`;

    for (const id of samples) {
      await cdp.send("Page.navigate", { url: `${base}?c=${id}` });
      await sleep(700);
      await waitPlaytest(cdp);
      let s = await snap(cdp);
      if (s.fileId !== id) throw new Error(`boot ${id} fail: ` + JSON.stringify(s));
      await screenshot(cdp, path.join(EVID, `shots/${id}_boot.png`));

      // first waiting guest is fox for these levels
      await clickChar(cdp, "fox");
      await clickSeat(cdp, "A1");
      s = await snap(cdp);
      if (s.assignment?.fox !== "A1") throw new Error(`${id} place fail: ` + JSON.stringify(s));
      await screenshot(cdp, path.join(EVID, `shots/${id}_placed.png`));
      results.push({ step: `${id}_place`, pass: true, levelId: s.levelId });
      note(`[PASS] ${id} place fox→A1`);

      await clickUndo(cdp);
      s = await snap(cdp);
      const seated = Object.values(s.assignment || {}).filter(Boolean).length;
      if (seated !== 0 || s.historyLen !== 0) throw new Error(`${id} undo fail: ` + JSON.stringify(s));
      await screenshot(cdp, path.join(EVID, `shots/${id}_undo.png`));
      results.push({ step: `${id}_undo`, pass: true });
      note(`[PASS] ${id} undo`);
    }

    note("[未测] 真机 / 多指（CDP mouse-sim ≠ 真机）");
  } finally {
    try { cdp?.close(); } catch {}
    try { chrome.kill("SIGKILL"); } catch {}
    try { httpProc.kill("SIGKILL"); } catch {}
    try { rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  }

  const after = distProof();
  writeFileSync(path.join(EVID, "dist-proof-after.txt"), JSON.stringify(after, null, 2) + "\n");
  if (after.sha256 !== before.sha256 || after.bytes !== before.bytes) {
    throw new Error("dist changed during T-048 — forbidden");
  }

  const summary = {
    task: "T-048",
    kind: "candidates-playtest-ui-sample-c05-c08-c11",
    shippedClaim: false,
    input: "mouse-sim (CDP Input.dispatchMouseEvent)",
    deviceUntested: true,
    samples: ["c05", "c08", "c11"],
    results,
    pageErrors: cdp?.pageErrors || [],
    dist: after,
    expectedProductSha256: "19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5",
    baselineTipMin: "57896e748d38c24c9d900026d5b66e6e8df36864",
  };
  writeFileSync(path.join(EVID, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
  writeFileSync(path.join(EVID, "full-log.txt"), log.join("\n") + "\n");
  writeFileSync(path.join(EVID, "command.txt"),
    "cd banquet-pilot && node --experimental-websocket tests/evidence/scripts/t048-playtest-ui-sample-c05-c08-c11.mjs\n");
  if (chromeErr) writeFileSync(path.join(EVID, "chrome-stderr-tail.txt"), chromeErr.slice(-4000));

  console.log(JSON.stringify({ ok: true, evid: EVID, steps: results.map((r) => r.step) }, null, 2));
}

main().catch((e) => {
  console.error("T-048 FAIL", e);
  try {
    mkdirSync(EVID, { recursive: true });
    writeFileSync(path.join(EVID, "FAIL.txt"), String(e?.stack || e) + "\n");
  } catch {}
  process.exit(1);
});
