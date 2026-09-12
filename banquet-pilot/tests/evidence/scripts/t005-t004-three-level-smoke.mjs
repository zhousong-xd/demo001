/**
 * T-005 AUTHOR REGRESSION wrapper — NOT independent QA.
 * Writes to banquet-pilot/evidence/t005-author-regression/t004-three-level/
 * Product under test FIXED at f28893f3… — do not rebuild.
 */
/**
 * T-004 three-level playable evidence (mouse-sim).
 * L01/L02/L03 win + advance, calm_bell invalid/apply/undo/replay,
 * hints, corrupt-save recovery, standalone HTML boot.
 * mouse-sim: yes; touch-sim: no (this script); 真机未测
 *
 *   node --experimental-websocket banquet-pilot/tests/evidence/scripts/t004-three-level-smoke.mjs
 */
import { spawn } from "node:child_process";
import {
  writeFileSync,
  mkdirSync,
  readFileSync,
  existsSync,
  mkdtempSync,
  rmSync,
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
const EVID = path.join(ROOT, "evidence/t005-author-regression/t004-three-level");
const DIST = path.join(ROOT, "dist/banquet-pilot.html");

let HTTP_PORT = 0;
let CDP_PORT = 0;
let BASE = "";
const notes = [];
function note(s) {
  notes.push(s);
  console.log(s);
}

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
    XDG_CONFIG_HOME: path.join(tmp, "banquet-t004-xdg-config"),
    XDG_CACHE_HOME: path.join(tmp, "banquet-t004-xdg-cache"),
    XDG_DATA_HOME: path.join(tmp, "banquet-t004-xdg-data"),
  };
  for (const [k, v] of Object.entries(extra)) {
    if (v != null) env[k] = String(v);
  }
  for (const banned of [
    "GH_TOKEN", "GITHUB_TOKEN", "GITHUB_PAT", "PAT", "GH_PAT",
    "DISPLAY", "WAYLAND_DISPLAY", "DBUS_SESSION_BUS_ADDRESS", "XAUTHORITY",
    "BANQUET_EVIDENCE_ISOLATED",
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
    http
      .get(u, (res) => {
        let d = "";
        res.on("data", (c) => (d += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(d));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on("error", reject);
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
      const page = (list || []).find(
        (t) => t.type === "page" && t.webSocketDebuggerUrl,
      );
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
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.addEventListener("open", () => res());
      this.ws.addEventListener("error", (e) => rej(e));
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(
        typeof ev.data === "string" ? ev.data : ev.data.toString(),
      );
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
  async eval(expression, returnByValue = true) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      returnByValue,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error(
        "eval: " +
          (r.exceptionDetails.text || JSON.stringify(r.exceptionDetails)),
      );
    }
    return r.result?.value;
  }
  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function waitReady(cdp, maxMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const ok = await cdp.eval(`!!window.__BANQUET__ && !!window.__BANQUET__.levelId`);
    if (ok) return;
    await sleep(80);
  }
  throw new Error("timeout __BANQUET__");
}

async function shot(cdp, filePath) {
  const r = await cdp.send("Page.captureScreenshot", { format: "png" });
  writeFileSync(filePath, Buffer.from(r.data, "base64"));
}

async function centerOf(cdp, selector) {
  const box = await cdp.eval(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  })()`);
  if (!box) throw new Error("missing " + selector);
  return box;
}

async function mouseClick(cdp, x, y) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed", x, y, button: "left", clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x, y, button: "left", clickCount: 1,
  });
}

async function clickChar(cdp, charId) {
  const box = await centerOf(cdp, `.char[data-char="${charId}"]`);
  await mouseClick(cdp, box.x, box.y);
  await sleep(60);
}

async function clickSeat(cdp, seat) {
  // click empty area of seat (top-leftish) to avoid hitting occupant center only
  const box = await cdp.eval(`(() => {
    const el = document.querySelector('.seat[data-seat="${seat}"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width*0.5, y: r.top + r.height*0.75 };
  })()`);
  if (!box) throw new Error("missing seat " + seat);
  await mouseClick(cdp, box.x, box.y);
  await sleep(60);
}

async function placeClickPath(cdp, mapping) {
  for (const [charId, seat] of Object.entries(mapping)) {
    await clickChar(cdp, charId);
    await clickSeat(cdp, seat);
  }
}

async function btnClick(cdp, label) {
  await cdp.eval(
    `([...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})).click()`,
  );
  await sleep(80);
}

async function btnIncludes(cdp, part) {
  await cdp.eval(`
    (() => {
      const b = [...document.querySelectorAll('button')].find(x => x.textContent.includes(${JSON.stringify(part)}));
      if (!b) throw new Error('btn missing ' + ${JSON.stringify(part)});
      b.click();
    })()
  `);
  await sleep(80);
}

async function state(cdp) {
  return JSON.parse(
    await cdp.eval(`JSON.stringify({
      levelId: __BANQUET__.levelId,
      won: __BANQUET__.won,
      showFeast: __BANQUET__.showFeast,
      assignment: __BANQUET__.assignment,
      calm: __BANQUET__.calm,
      inventory: __BANQUET__.inventory,
      hintTier: __BANQUET__.hintTier,
      historyLen: __BANQUET__.historyLen,
      propMode: __BANQUET__.propMode,
      storageMsg: document.querySelector('.storage-msg')?.textContent || '',
      embedded: !!window.__BANQUET_EMBEDDED_LEVELS__
    })`),
  );
}

async function navigateLevel(cdp, level) {
  await cdp.send("Page.navigate", { url: `${BASE}?level=${level}` });
  await waitReady(cdp);
  await sleep(80);
}

async function main() {
  if (typeof WebSocket === "undefined") {
    console.error("Need WebSocket: run with node --experimental-websocket …");
    process.exit(1);
  }
  if (!existsSync(DIST)) throw new Error("missing dist — build first");

  mkdirSync(EVID, { recursive: true });
  const distBuf = readFileSync(DIST);
  const distMeta = {
    path: "banquet-pilot/dist/banquet-pilot.html",
    bytes: distBuf.length,
    sha256: createHash("sha256").update(distBuf).digest("hex"),
  };

  const profile = mkdtempSync(path.join(os.tmpdir(), "banquet-t004-ud-"));
  const childEnv = buildChildEnv();
  HTTP_PORT = await freePort();
  BASE = `http://127.0.0.1:${HTTP_PORT}/`;

  const httpProc = spawn(
    "python3",
    ["-m", "http.server", String(HTTP_PORT), "--bind", "127.0.0.1"],
    { cwd: ROOT, stdio: "ignore", env: childEnv },
  );
  await sleep(350);

  const chromeArgs = [
    "--headless=new",
    "--remote-debugging-address=127.0.0.1",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-extensions",
    "--metrics-recording-only",
    "--disable-dev-shm-usage",
    "--window-size=390,844",
    "about:blank",
  ];

  const chrome = spawn("google-chrome", chromeArgs, {
    env: childEnv,
    stdio: ["ignore", "ignore", "pipe"],
  });
  let chromeErr = "";
  chrome.stderr.on("data", (d) => {
    chromeErr += d.toString();
  });

  const summary = {
    task: "T-004",
    mouseSim: true,
    touchSim: false,
    realDevice: "真机未测",
    dist: distMeta,
    steps: [],
  };

  let cdp;
  try {
    const devtools = await waitForDevtoolsEndpoint(profile, 30000);
    CDP_PORT = devtools.port;
    note(`http=${HTTP_PORT} cdp=${CDP_PORT}`);
    const page = await waitForPage(CDP_PORT);
    cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390, height: 844, deviceScaleFactor: 1, mobile: true,
    });

    // clear storage then L01
    await navigateLevel(cdp, "L01");
    await cdp.eval(`localStorage.clear()`);
    await navigateLevel(cdp, "L01");

    const l01 = { fox: "A1", otter: "A2", crane: "B1", rabbit: "B2" };
    await placeClickPath(cdp, l01);
    let st = await state(cdp);
    note(`L01 won=${st.won} feast=${st.showFeast}`);
    summary.steps.push({ id: "L01_win", ...st });
    await shot(cdp, path.join(EVID, "L01_feast.png"));
    if (!st.won) throw new Error("L01 expected win");

    await btnIncludes(cdp, "下一关");
    st = await state(cdp);
    note(`advance ${st.levelId}`);
    summary.steps.push({ id: "to_L02", levelId: st.levelId });
    if (st.levelId !== "L02") throw new Error("expected L02");

    await btnIncludes(cdp, "提示");
    await btnIncludes(cdp, "提示");
    st = await state(cdp);
    note(`hints tier=${st.hintTier}`);
    summary.steps.push({ id: "L02_hints", hintTier: st.hintTier });
    await shot(cdp, path.join(EVID, "L02_hints.png"));
    if (st.hintTier < 2) throw new Error("hints not revealed");

    const l02 = {
      fox: "A1", otter: "A2", hedgehog: "A3",
      rabbit: "B1", tanuki: "B2", crane: "B3",
    };
    await placeClickPath(cdp, l02);
    st = await state(cdp);
    note(`L02 won=${st.won}`);
    summary.steps.push({ id: "L02_win", ...st });
    await shot(cdp, path.join(EVID, "L02_feast.png"));
    if (!st.won) throw new Error("L02 expected win");

    await btnIncludes(cdp, "下一关");
    st = await state(cdp);
    if (st.levelId !== "L03") throw new Error("expected L03");
    note(`L03 inventory=${JSON.stringify(st.inventory)}`);

    // invalid calm target
    await btnIncludes(cdp, "安心铃");
    await clickChar(cdp, "fox");
    st = await state(cdp);
    note(`invalid target stock=${st.inventory.calm_bell} msg=${st.storageMsg}`);
    summary.steps.push({ id: "L03_invalid", inventory: st.inventory, msg: st.storageMsg });
    if (st.inventory.calm_bell !== 1) throw new Error("invalid consumed");
    await shot(cdp, path.join(EVID, "L03_invalid_target.png"));

    // apply calm to rabbit
    await btnIncludes(cdp, "安心铃");
    await clickChar(cdp, "rabbit");
    st = await state(cdp);
    note(`calm applied ${JSON.stringify({ calm: st.calm, inv: st.inventory })}`);
    summary.steps.push({ id: "L03_calm", calm: st.calm, inventory: st.inventory });
    if (!st.calm.includes("rabbit") || st.inventory.calm_bell !== 0) {
      throw new Error("calm apply failed");
    }
    await shot(cdp, path.join(EVID, "L03_calm.png"));

    // undo
    await btnClick(cdp, "撤销");
    st = await state(cdp);
    note(`undo ${JSON.stringify({ calm: st.calm, inv: st.inventory })}`);
    summary.steps.push({ id: "L03_undo", calm: st.calm, inventory: st.inventory });
    if (st.inventory.calm_bell !== 1 || st.calm.includes("rabbit")) {
      throw new Error("undo failed");
    }

    // re-apply + win
    await btnIncludes(cdp, "安心铃");
    await clickChar(cdp, "rabbit");
    const l03 = {
      fox: "A1", otter: "A2", hedgehog: "A3",
      rabbit: "B1", crane: "B2", tanuki: "B3",
    };
    await placeClickPath(cdp, l03);
    st = await state(cdp);
    note(`L03 won=${st.won} calm=${st.calm}`);
    summary.steps.push({ id: "L03_win", ...st });
    await shot(cdp, path.join(EVID, "L03_feast.png"));
    if (!st.won) throw new Error("L03 expected win");

    // replay restores stock
    await btnIncludes(cdp, "重玩");
    st = await state(cdp);
    note(`replay stock=${st.inventory.calm_bell}`);
    summary.steps.push({ id: "L03_replay", inventory: st.inventory, won: st.won });
    if (st.inventory.calm_bell !== 1) throw new Error("replay stock");

    // corrupt save — wait for idle page before injecting corrupt payload
    await navigateLevel(cdp, "L01");
    await cdp.eval(`localStorage.setItem('banquet-pilot-save-v1', '{not-json');`);
    const rawCheck = await cdp.eval(`localStorage.getItem('banquet-pilot-save-v1')`);
    if (rawCheck !== '{not-json') throw new Error('failed to plant corrupt save');
    await cdp.send("Page.navigate", { url: BASE });
    await waitReady(cdp);
    await sleep(100);
    st = await state(cdp);
    note(`corrupt recover level=${st.levelId} msg=${st.storageMsg}`);
    summary.steps.push({
      id: "corrupt_save",
      levelId: st.levelId,
      msg: st.storageMsg,
      allWaiting: Object.values(st.assignment).every((v) => v == null),
    });
    await shot(cdp, path.join(EVID, "corrupt_save_recover.png"));
    if (!st.storageMsg.includes("损坏")) {
      throw new Error("corrupt save message missing: " + st.storageMsg);
    }
    if (!Object.values(st.assignment).every((v) => v == null)) {
      throw new Error("corrupt save did not recover to start");
    }

    // standalone
    await cdp.send("Page.navigate", {
      url: `http://127.0.0.1:${HTTP_PORT}/dist/banquet-pilot.html?level=L03`,
    });
    await waitReady(cdp);
    st = await state(cdp);
    note(`standalone embedded=${st.embedded} level=${st.levelId} stock=${st.inventory.calm_bell}`);
    summary.steps.push({
      id: "standalone",
      embedded: st.embedded,
      levelId: st.levelId,
      inventory: st.inventory,
    });
    await shot(cdp, path.join(EVID, "standalone_L03.png"));
    if (!st.embedded || st.levelId !== "L03") throw new Error("standalone failed");

    summary.ok = true;
    writeFileSync(path.join(EVID, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    writeFileSync(
      path.join(EVID, "NOTES.md"),
      [
        "# T-004 three-level evidence",
        "",
        "- mouse-sim: yes (CDP Input.dispatchMouseEvent)",
        "- touch-sim: no (this script)",
        "- 真机未测",
        `- standalone: ${distMeta.path} size=${distMeta.bytes} sha256=${distMeta.sha256}`,
        "",
        "## Log",
        ...notes.map((n) => `- ${n}`),
        "",
      ].join("\n"),
    );
    note("DONE ok");
  } catch (e) {
    summary.ok = false;
    summary.error = String(e);
    writeFileSync(path.join(EVID, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    writeFileSync(path.join(EVID, "NOTES.md"), notes.join("\n") + "\n\nERROR: " + e + "\n");
    throw e;
  } finally {
    try { cdp?.close(); } catch {}
    try { chrome.kill("SIGKILL"); } catch {}
    try { httpProc.kill("SIGKILL"); } catch {}
    try { rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
