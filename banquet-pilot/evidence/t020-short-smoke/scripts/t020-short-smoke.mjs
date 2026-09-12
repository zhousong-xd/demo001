/**
 * T-020 short smoke (role:BOT / 宴席·质检). Non-device.
 * Product FIXED — do not rebuild. Writes under evidence/t020-short-smoke/.
 * NOT 真机. mouse-sim / CDP only.
 *
 *   node --experimental-websocket banquet-pilot/evidence/t020-short-smoke/scripts/t020-short-smoke.mjs
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
const EVID = path.resolve(__dirname, "..");
const SHOTS = path.join(EVID, "shots");
const ROOT = path.resolve(__dirname, "../../.."); // banquet-pilot
const DIST = path.join(ROOT, "dist/banquet-pilot.html");
const PRODUCT_SHA = "f28893f3c419d794c6ba102bac67038683cb462c";
const EXPECT_BYTES = 73182;
const EXPECT_HASH =
  "19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5";

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
    XDG_CONFIG_HOME: path.join(tmp, "banquet-t020-xdg-config"),
    XDG_CACHE_HOME: path.join(tmp, "banquet-t020-xdg-cache"),
    XDG_DATA_HOME: path.join(tmp, "banquet-t020-xdg-data"),
  };
  for (const [k, v] of Object.entries(extra)) {
    if (v != null) env[k] = String(v);
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

async function waitCdp(port, tries = 100) {
  for (let i = 0; i < tries; i++) {
    try {
      const list = await fetchJson(`http://127.0.0.1:${port}/json/list`);
      if (Array.isArray(list) && list.length) return list;
    } catch {}
    await sleep(100);
  }
  throw new Error("CDP not ready");
}

class Cdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 0;
    this.pending = new Map();
    this.console = [];
    this.exceptions = [];
  }
  async connect() {
    if (typeof WebSocket === "undefined") {
      throw new Error("Need WebSocket: run with node --experimental-websocket …");
    }
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.addEventListener("open", () => res(), { once: true });
      this.ws.addEventListener("error", (e) => rej(e.error || e), { once: true });
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : String(ev.data));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method === "Runtime.consoleAPICalled") {
        this.console.push(msg.params);
      } else if (msg.method === "Runtime.exceptionThrown") {
        this.exceptions.push(msg.params);
      }
    });
  }
  send(method, params = {}) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async eval(expression, awaitPromise = false) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise,
      returnByValue: true,
    });
    if (r.exceptionDetails) {
      throw new Error(
        "eval: " +
          (r.exceptionDetails.exception?.description ||
            r.exceptionDetails.text ||
            JSON.stringify(r.exceptionDetails)),
      );
    }
    return r.result?.value;
  }
  close() {
    try {
      this.ws?.close();
    } catch {}
  }
}

async function shot(cdp, file) {
  const { data } = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  writeFileSync(file, Buffer.from(data, "base64"));
}

async function clickXY(cdp, x, y) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed", x, y, button: "left", clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased", x, y, button: "left", clickCount: 1,
  });
}

async function getState(cdp) {
  return cdp.eval(`(() => {
    const B = window.__BANQUET__ || {};
    const storageMsg = document.querySelector('.storage-msg')?.textContent || '';
    return {
      assignment: B.assignment || {},
      historyLen: B.historyLen ?? 0,
      inventory: B.inventory || {},
      calm: B.calm || [],
      levelId: B.levelId || "",
      won: !!B.won,
      showFeast: !!B.showFeast,
      msg: storageMsg,
      storageMsg,
      gestureActive: !!B.gestureActive,
      embedded: !!(document.documentElement.dataset.embedded || window.__BANQUET_EMBEDDED_LEVELS__),
      propMode: B.propMode ?? null,
      hintTier: B.hintTier ?? 0,
    };
  })()`);
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

async function seatBox(cdp, seatId) {
  return cdp.eval(`(() => {
    const el = document.querySelector('.seat[data-seat="${seatId}"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width*0.5, y: r.top + r.height*0.75, w: r.width, h: r.height };
  })()`);
}

async function charBox(cdp, charId) {
  return cdp.eval(`(() => {
    const el = document.querySelector('.char[data-char="${charId}"]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2 };
  })()`);
}

async function clickSeat(cdp, seatId) {
  const b = await seatBox(cdp, seatId);
  if (!b) throw new Error("no seat " + seatId);
  await clickXY(cdp, b.x, b.y);
  await sleep(80);
}

async function clickChar(cdp, charId) {
  const b = await charBox(cdp, charId);
  if (!b) throw new Error("no char " + charId);
  await clickXY(cdp, b.x, b.y);
  await sleep(80);
}

async function btnIncludes(cdp, label) {
  await cdp.eval(
    `(() => {
      const btns = [...document.querySelectorAll('button')];
      const el = btns.find(b => (b.textContent||'').includes(${JSON.stringify(label)}));
      if (!el) throw new Error('no button includes ' + ${JSON.stringify(label)});
      el.click();
    })()`,
  );
  await sleep(120);
}

async function placeClickPath(cdp, mapping) {
  for (const [charId, seatId] of Object.entries(mapping)) {
    await clickChar(cdp, charId);
    await clickSeat(cdp, seatId);
  }
}

function hashFile(p) {
  const buf = readFileSync(p);
  return {
    bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
    hasCR: buf.includes(0x0d),
  };
}

async function startHttp() {
  HTTP_PORT = await freePort();
  CDP_PORT = await freePort();
  const server = http.createServer((req, res) => {
    let rel = decodeURIComponent((req.url || "/").split("?")[0]);
    if (rel === "/") rel = "/index.html";
    const file = path.join(ROOT, rel.replace(/^\//, ""));
    if (!file.startsWith(ROOT) || !existsSync(file)) {
      res.writeHead(404);
      res.end("missing");
      return;
    }
    const ext = path.extname(file);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".mjs": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json",
      ".svg": "image/svg+xml",
      ".png": "image/png",
    };
    res.writeHead(200, { "Content-Type": types[ext] || "application/octet-stream" });
    res.end(readFileSync(file));
  });
  await new Promise((r) => server.listen(HTTP_PORT, "127.0.0.1", r));
  BASE = `http://127.0.0.1:${HTTP_PORT}`;
  note(`http=${HTTP_PORT} cdp=${CDP_PORT}`);
  return server;
}

async function launchChrome(userData, extraArgs = []) {
  const chrome =
    process.env.CHROME_PATH ||
    (existsSync("/usr/bin/google-chrome")
      ? "/usr/bin/google-chrome"
      : "/usr/bin/chromium");
  const args = [
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${userData}`,
    "--headless=new",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--disable-background-networking",
    "--no-first-run",
    "--no-default-browser-check",
    "--window-size=390,844",
    ...extraArgs,
    "about:blank",
  ];
  const child = spawn(chrome, args, {
    env: buildChildEnv(),
    stdio: ["ignore", "pipe", "pipe"],
  });
  let err = "";
  child.stderr.on("data", (d) => {
    err += String(d);
  });
  await waitCdp(CDP_PORT);
  return { child, err };
}

async function attachBlank() {
  const list = await waitCdp(CDP_PORT);
  const page =
    list.find((t) => t.type === "page" && t.webSocketDebuggerUrl) || list[0];
  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  return cdp;
}

async function navigate(cdp, url) {
  await cdp.send("Page.navigate", { url });
  await sleep(600);
  await waitReady(cdp);
}

async function main() {
  mkdirSync(SHOTS, { recursive: true });
  const distMeta = hashFile(DIST);
  note(`dist bytes=${distMeta.bytes} sha256=${distMeta.sha256} hasCR=${distMeta.hasCR}`);
  if (distMeta.bytes !== EXPECT_BYTES) throw new Error("dist size mismatch");
  if (distMeta.sha256 !== EXPECT_HASH) throw new Error("dist hash mismatch");
  if (distMeta.hasCR) throw new Error("dist has CR (not LF-only)");

  const summary = {
    task: "T-020",
    kind: "SHORT SMOKE",
    role: "BOT",
    agent: "宴席·质检",
    issue: 26,
    productSha: PRODUCT_SHA,
    mouseSim: true,
    touchSim: false,
    realDevice: "真机未测",
    multitouch: "未测",
    dist: {
      path: "banquet-pilot/dist/banquet-pilot.html",
      bytes: distMeta.bytes,
      sha256: distMeta.sha256,
      lfOnly: !distMeta.hasCR,
    },
    cases: [],
    failures: [],
    ok: false,
  };

  function record(step) {
    summary.cases.push(step);
    const mark = step.status || (step.ok ? "PASS" : "FAIL");
    step.status = mark;
    note(`[${mark}] ${step.id} ${step.note || ""}`);
    if (mark === "FAIL") summary.failures.push(step.id);
  }

  const server = await startHttp();
  const userData = mkdtempSync(path.join(os.tmpdir(), "banquet-t020-"));
  let chrome;
  let cdp;
  try {
    chrome = await launchChrome(userData);
    cdp = await attachBlank();
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    // --- L01: boot frozen standalone + 通关路径 ---
    await cdp.eval(`try { localStorage.clear(); } catch (e) {}`);
    await navigate(cdp, `${BASE}/dist/banquet-pilot.html?level=L01`);
    let st = await getState(cdp);
    await shot(cdp, path.join(SHOTS, "L01_boot.png"));
    const bootOk = st.embedded === true && st.levelId === "L01";
    record({
      id: "L01_boot_standalone",
      ok: bootOk,
      status: bootOk ? "PASS" : "FAIL",
      levelId: st.levelId,
      embedded: st.embedded,
      input: "n/a (boot)",
      note: bootOk ? "frozen dist boots L01 embedded" : "boot failed",
    });
    if (!bootOk) throw new Error("L01 boot failed");

    await placeClickPath(cdp, {
      fox: "A1",
      otter: "A2",
      crane: "B1",
      rabbit: "B2",
    });
    st = await getState(cdp);
    await shot(cdp, path.join(SHOTS, "L01_feast.png"));
    const l01Ok = st.won === true && st.showFeast === true && st.assignment.fox === "A1";
    record({
      id: "L01_click_win",
      ok: l01Ok,
      status: l01Ok ? "PASS" : "FAIL",
      won: st.won,
      showFeast: st.showFeast,
      assignment: st.assignment,
      input: "mouse-sim",
      viewport: "390x844",
      note: l01Ok ? "通关路径：fox/otter/crane/rabbit → A1/A2/B1/B2 + 开席" : "L01 win failed",
    });
    if (!l01Ok) throw new Error("L01 win failed " + JSON.stringify(st));

    // --- L03: 安心铃误投不扣 + 对兔有效 ---
    await navigate(cdp, `${BASE}/dist/banquet-pilot.html?level=L03`);
    st = await getState(cdp);
    note(`L03 stock=${JSON.stringify(st.inventory)} embedded=${st.embedded} level=${st.levelId}`);
    const l03boot = st.levelId === "L03" && st.inventory.calm_bell === 1;
    if (!l03boot) throw new Error("L03 boot unexpected: " + JSON.stringify(st));

    await btnIncludes(cdp, "安心铃");
    await clickChar(cdp, "fox");
    st = await getState(cdp);
    await shot(cdp, path.join(SHOTS, "L03_invalid_calm.png"));
    const invalidOk =
      st.inventory.calm_bell === 1 &&
      String(st.storageMsg || st.msg || "").includes("无效");
    record({
      id: "L03_calm_invalid_no_consume",
      ok: invalidOk,
      status: invalidOk ? "PASS" : "FAIL",
      inventory: st.inventory,
      msg: st.storageMsg || st.msg,
      input: "mouse-sim",
      note: invalidOk ? "误投狐：库存仍为 1，提示无效" : "invalid calm consume or msg",
    });
    if (!invalidOk) throw new Error("invalid calm: " + JSON.stringify(st));

    await btnIncludes(cdp, "安心铃");
    await clickChar(cdp, "rabbit");
    st = await getState(cdp);
    await shot(cdp, path.join(SHOTS, "L03_calm_apply.png"));
    const calmOk = st.calm.includes("rabbit") && st.inventory.calm_bell === 0;
    record({
      id: "L03_calm_apply_rabbit",
      ok: calmOk,
      status: calmOk ? "PASS" : "FAIL",
      calm: st.calm,
      inventory: st.inventory,
      input: "mouse-sim",
      note: calmOk ? "对兔有效：calm=[rabbit]，库存 0" : "calm apply failed",
    });
    if (!calmOk) throw new Error("calm apply failed");

    // --- 真机 / 多指：未测，不得 PASS ---
    record({
      id: "real_device_multitouch",
      ok: false,
      status: "未测",
      input: "真机",
      note: "无实体机；CDP mouse-sim ≠ 真机/多指。不得 PASS。",
    });

    const requiredFail = summary.failures.filter((id) => id !== "real_device_multitouch");
    summary.ok = requiredFail.length === 0;
    summary.exceptionCount = cdp.exceptions.length;
    writeFileSync(
      path.join(EVID, "summary.json"),
      JSON.stringify(summary, null, 2) + "\n",
    );
    writeFileSync(
      path.join(EVID, "NOTES.md"),
      [
        "# T-020 Short Smoke — NOTES",
        "",
        `- Product SHA: \`${PRODUCT_SHA}\``,
        `- HTML: ${EXPECT_BYTES} LF / \`${EXPECT_HASH}\``,
        "- Input: mouse-sim (CDP); touch-sim: not claimed; **真机未测** / **多指未测**",
        "- Script: `evidence/t020-short-smoke/scripts/t020-short-smoke.mjs`",
        "- Product under test: frozen `dist/banquet-pilot.html` (standalone)",
        "",
        "## Log",
        ...notes.map((n) => `- ${n}`),
        "",
        `## Result: ${summary.ok ? "PASS" : "FAIL"} (failures=${summary.failures.join(",") || "none"})`,
        "",
        "— agent:宴席·质检 role:BOT · task:T-020 · SHORT SMOKE · issue:#26",
        "",
      ].join("\n"),
    );
    note(`DONE ok=${summary.ok} failures=${summary.failures.length}`);
    if (!summary.ok) process.exitCode = 1;
  } catch (e) {
    summary.ok = false;
    summary.error = String(e && e.stack ? e.stack : e);
    writeFileSync(
      path.join(EVID, "summary.json"),
      JSON.stringify(summary, null, 2) + "\n",
    );
    writeFileSync(
      path.join(EVID, "NOTES.md"),
      notes.join("\n") + "\n\nERROR: " + e + "\n",
    );
    console.error(e);
    process.exitCode = 1;
  } finally {
    try {
      cdp?.close();
    } catch {}
    try {
      chrome?.child?.kill("SIGKILL");
    } catch {}
    try {
      server.close();
    } catch {}
    try {
      rmSync(userData, { recursive: true, force: true });
    } catch {}
  }
}

main();
