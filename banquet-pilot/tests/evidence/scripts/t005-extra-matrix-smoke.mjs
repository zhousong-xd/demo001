/**
 * T-005 AUTHOR REGRESSION extra matrix — NOT independent QA.
 * Covers: desktop viewport, offline file:// boot, 重置 restart,
 * background/visibility gesture cancel + restore, empty-seat baseline click.
 * Product FIXED: do not rebuild. Writes to evidence/t005-author-regression/extra/
 *
 *   node --experimental-websocket banquet-pilot/tests/evidence/scripts/t005-extra-matrix-smoke.mjs
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
import { pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const EVID = path.join(ROOT, "evidence/t005-author-regression/extra");
const DIST = path.join(ROOT, "dist/banquet-pilot.html");
const REPO = path.resolve(ROOT, "..");

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
    XDG_CONFIG_HOME: path.join(tmp, "banquet-t005x-xdg-config"),
    XDG_CACHE_HOME: path.join(tmp, "banquet-t005x-xdg-cache"),
    XDG_DATA_HOME: path.join(tmp, "banquet-t005x-xdg-data"),
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

async function waitCdp(port, tries = 80) {
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
    type: "mousePressed",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x,
    y,
    button: "left",
    clickCount: 1,
  });
}

async function getState(cdp) {
  return cdp.eval(`(() => {
    const B = window.__BANQUET__ || {};
    return {
      assignment: B.assignment || {},
      historyLen: B.historyLen ?? 0,
      inventory: B.inventory || {},
      calm: B.calm || [],
      levelId: B.levelId || "",
      won: !!B.won,
      showFeast: !!B.showFeast,
      msg: B.storageMsg || "",
      gestureActive: !!B.gestureActive,
      embedded: !!document.documentElement.dataset.embedded || !!window.__BANQUET_EMBEDDED_LEVELS__,
      propMode: B.propMode ?? null,
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
    return { x: r.left + r.width*0.5, y: r.top + r.height*0.75, w: r.width, h: r.height, cx: r.left + r.width/2, cy: r.top + r.height/2 };
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

async function btnBox(cdp, label) {
  return cdp.eval(`(() => {
    const btns = [...document.querySelectorAll('button')];
    const el = btns.find(b => (b.textContent||'').trim() === '${label}');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width/2, y: r.top + r.height/2, label: '${label}' };
  })()`);
}

async function clickSeat(cdp, seatId) {
  const b = await seatBox(cdp, seatId);
  if (!b) throw new Error("no seat " + seatId);
  await clickXY(cdp, b.x, b.y);
}

async function clickChar(cdp, charId) {
  const b = await charBox(cdp, charId);
  if (!b) throw new Error("no char " + charId);
  await clickXY(cdp, b.x, b.y);
}

async function clickBtn(cdp, label) {
  await cdp.eval(
    `([...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})).click()`,
  );
  await sleep(80);
}

async function setViewport(cdp, w, h) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: h,
    deviceScaleFactor: 1,
    mobile: w < 800,
  });
}

function hashFile(p) {
  const buf = readFileSync(p);
  return {
    bytes: buf.length,
    sha256: createHash("sha256").update(buf).digest("hex"),
  };
}

async function startHttp() {
  HTTP_PORT = await freePort();
  CDP_PORT = await freePort();
  const server = http.createServer((req, res) => {
    // serve banquet-pilot static
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

async function launchChrome(userData) {
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
    "--window-size=1280,800",
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

async function attachPage(url) {
  const list = await waitCdp(CDP_PORT);
  const page =
    list.find((t) => t.type === "page" && t.webSocketDebuggerUrl) || list[0];
  const cdp = new Cdp(page.webSocketDebuggerUrl);
  await cdp.connect();
  await cdp.send("Runtime.enable");
  await cdp.send("Page.enable");
  await cdp.send("Page.navigate", { url });
  await cdp.send("Page.loadEventFired").catch(() => {});
  await sleep(800);
  return cdp;
}

async function main() {
  mkdirSync(EVID, { recursive: true });
  const distMeta = hashFile(DIST);
  note(
    `dist bytes=${distMeta.bytes} sha256=${distMeta.sha256}`,
  );
  if (distMeta.bytes !== 73182) throw new Error("dist size mismatch");
  if (
    distMeta.sha256 !==
    "19b8e65bbde285719ee43d74d83fcc60cdb3709ae7cc3ccc80d3f36d45d1bcf5"
  )
    throw new Error("dist hash mismatch");

  const summary = {
    task: "T-005",
    kind: "AUTHOR REGRESSION / NOT independent QA",
    productSha: "f28893f3c419d794c6ba102bac67038683cb462c",
    mouseSim: true,
    touchSim: false,
    realDevice: "真机未测",
    dist: { path: "banquet-pilot/dist/banquet-pilot.html", ...distMeta },
    steps: [],
    consoleErrors: [],
    ok: false,
  };

  const server = await startHttp();
  const userData = mkdtempSync(path.join(os.tmpdir(), "banquet-t005x-"));
  let chrome;
  let cdp;
  try {
    chrome = await launchChrome(userData);
    // Prefer modular index if present, else dist via http
    const indexUrl = existsSync(path.join(ROOT, "index.html"))
      ? `${BASE}/index.html`
      : `${BASE}/dist/banquet-pilot.html`;
    cdp = await attachPage(indexUrl);
    await waitReady(cdp);
    note("loaded " + indexUrl);

    // --- empty seat baseline: place fox on A1 ---
    await setViewport(cdp, 390, 844);
    await sleep(200);
    await clickChar(cdp, "fox");
    await clickSeat(cdp, "A1");
    await sleep(200);
    let st = await getState(cdp);
    const emptySeatOk = st.assignment?.fox === "A1";
    note(`empty-seat place fox→A1 ok=${emptySeatOk}`);
    await shot(cdp, path.join(EVID, "empty_seat_place.png"));
    summary.steps.push({
      id: "empty_seat_place",
      ok: emptySeatOk,
      assignment: st.assignment,
      input: "mouse-sim",
      viewport: "390x844",
    });
    if (!emptySeatOk) throw new Error("empty seat place failed");

    // --- restart / 重置 ---
    await clickBtn(cdp, "重玩");
    await sleep(300);
    st = await getState(cdp);
    const allNull = Object.values(st.assignment || {}).every((v) => !v);
    const restartOk = allNull && (st.historyLen === 0 || st.historyLen === undefined);
    note(`reset ok=${restartOk} hist=${st.historyLen} assign=${JSON.stringify(st.assignment)}`);
    await shot(cdp, path.join(EVID, "after_restart.png"));
    summary.steps.push({
      id: "restart_reset",
      ok: restartOk,
      historyLen: st.historyLen,
      assignment: st.assignment,
      input: "mouse-sim",
    });
    if (!restartOk) throw new Error("reset failed");

    // --- background / visibility: start drag then hide ---
    await clickChar(cdp, "fox");
    const fox = await charBox(cdp, "fox");
    const a1 = await seatBox(cdp, "A1");
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: fox.x,
      y: fox.y,
      button: "left",
      clickCount: 1,
    });
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: (fox.x + a1.cx) / 2,
      y: (fox.y + a1.cy) / 2,
      button: "left",
    });
    // simulate visibility hidden
    await cdp.eval(`(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      return document.hidden;
    })()`);
    await sleep(200);
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: a1.cx,
      y: a1.cy,
      button: "left",
      clickCount: 1,
    });
    await sleep(200);
    // restore visible
    await cdp.eval(`(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
      return document.hidden;
    })()`);
    st = await getState(cdp);
    const bgOk = st.assignment?.fox == null && !st.gestureActive;
    note(`background-visibility cancel ok=${bgOk} fox=${st.assignment?.fox} gesture=${st.gestureActive}`);
    await shot(cdp, path.join(EVID, "after_background_cancel.png"));
    summary.steps.push({
      id: "background_visibility_cancel",
      ok: bgOk,
      fox: st.assignment?.fox ?? null,
      gestureActive: st.gestureActive,
      input: "mouse-sim",
      note: "visibilitychange mid-drag cancels gesture; not physical backgrounding",
    });

    // place again then verify post-restore still works
    await clickChar(cdp, "fox");
    await clickSeat(cdp, "A1");
    await sleep(200);
    st = await getState(cdp);
    const restoreOk = st.assignment?.fox === "A1";
    note(`post-background restore place ok=${restoreOk}`);
    summary.steps.push({
      id: "post_background_restore_place",
      ok: restoreOk,
      assignment: st.assignment,
      input: "mouse-sim",
    });
    if (!restoreOk) throw new Error("post-background place failed");

    // --- desktop viewport ---
    await setViewport(cdp, 1280, 800);
    await sleep(300);
    const geo = await cdp.eval(`(() => {
      const seats = [...document.querySelectorAll('.seat[data-seat]')].map(el => {
        const r = el.getBoundingClientRect();
        return { id: el.dataset.seat, left: r.left, top: r.top, right: r.right, bottom: r.bottom, w: r.width, h: r.height };
      });
      const overlaps = [];
      for (let i=0;i<seats.length;i++) for (let j=i+1;j<seats.length;j++) {
        const a=seats[i], b=seats[j];
        if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) overlaps.push([a.id,b.id]);
      }
      return {
        innerWidth: window.innerWidth,
        innerHeight: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
        scrollWidthOk: document.documentElement.scrollWidth <= window.innerWidth + 1,
        seatCount: seats.length,
        overlaps,
      };
    })()`);
    const desktopOk = geo.innerWidth === 1280 && geo.scrollWidthOk && geo.overlaps.length === 0;
    note(`desktop 1280x800 ok=${desktopOk} ${JSON.stringify(geo)}`);
    await shot(cdp, path.join(EVID, "viewport_desktop_1280x800.png"));
    summary.steps.push({
      id: "viewport_desktop_1280x800",
      ok: desktopOk,
      geo,
      input: "mouse-sim",
      viewport: "1280x800",
    });
    if (!desktopOk) throw new Error("desktop viewport fail");

    // console errors from http session
    const pageErrors = cdp.exceptions.length;
    summary.consoleErrors = cdp.exceptions.map((e) => e.exceptionDetails?.text || "exception");
    summary.steps.push({
      id: "console_errors_http_session",
      ok: pageErrors === 0,
      exceptionCount: pageErrors,
      consoleEventCount: cdp.console.length,
    });
    note(`console exceptions=${pageErrors}`);

    cdp.close();

    // --- offline file:// load of dist ---
    const fileUrl = pathToFileURL(DIST).href;
    cdp = await attachPage(fileUrl);
    await waitReady(cdp);
    st = await getState(cdp);
    const offlineOk =
      st.embedded === true ||
      !!st.levelId ||
      existsSync(DIST);
    // Check page actually rendered seats
    const seatCount = await cdp.eval(
      `document.querySelectorAll('.seat[data-seat]').length`,
    );
    const offlineLoadOk = seatCount > 0;
    note(`offline file:// seats=${seatCount} level=${st.levelId} embedded=${st.embedded}`);
    await shot(cdp, path.join(EVID, "offline_file_load.png"));
    summary.steps.push({
      id: "offline_file_load",
      ok: offlineLoadOk,
      seatCount,
      levelId: st.levelId,
      embedded: st.embedded,
      url: "file://…/banquet-pilot/dist/banquet-pilot.html",
      input: "n/a (boot)",
      note: "no network; Chrome --disable-background-networking + file://",
    });
    if (!offlineLoadOk) throw new Error("offline file load failed");

    await shot(cdp, path.join(EVID, "offline_file_load_done.png"));
    cdp.close();

    summary.ok = summary.steps.every((s) => s.ok !== false);
    writeFileSync(path.join(EVID, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
    writeFileSync(
      path.join(EVID, "NOTES.md"),
      [
        "# T-005 AUTHOR REGRESSION — extra matrix",
        "",
        "**NOT independent QA.** Author-adjacent evidence only.",
        "",
        `- productSha: f28893f3c419d794c6ba102bac67038683cb462c`,
        `- dist: ${distMeta.bytes} / ${distMeta.sha256}`,
        `- mouse-sim: yes; touch-sim: no (this script); 真机: 未测`,
        "",
        "## Steps",
        ...summary.steps.map(
          (s) => `- ${s.id}: ${s.ok ? "PASS" : "FAIL"} ${s.note || ""}`,
        ),
        "",
        "## Log",
        ...notes.map((n) => `- ${n}`),
        "",
      ].join("\n"),
    );
    note("T-005 extra matrix DONE ok=" + summary.ok);
  } catch (e) {
    summary.ok = false;
    summary.error = String(e);
    writeFileSync(path.join(EVID, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
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
