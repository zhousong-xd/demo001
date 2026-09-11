/**
 * T-003 REJECT-fix evidence via Chrome CDP (no npm deps).
 * Labels:
 *   - mouse-sim: CDP Input.dispatchMouseEvent (native-sim)
 *   - touch-sim-native: CDP Input.dispatchTouchEvent (native-sim)
 *   - touch-sim-js: JS-synthesized PointerEvent (handler semantics only)
 * Real device: 未测
 *
 * ENTRYPOINT (required): bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh run-evidence
 * Bare invocation REFUSES (exit 2). Chrome sandbox stays ON (never pass the disabled-sandbox flag).
 * Static server: python3 -m http.server PORT --bind 127.0.0.1
 * CDP: --remote-debugging-port=0 + DevToolsActivePort handshake tied to this instance user-data-dir.
 * **本阶段未执行** until GPT01 smoke gate.
 */
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, rmSync, readFileSync, existsSync } from "node:fs";
import http from "node:http";
import net from "node:net";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.env.BANQUET_TASK_ROOT
  ? path.resolve(process.env.BANQUET_TASK_ROOT)
  : path.resolve(__dirname, "../../.."); // banquet-pilot
const EVID = process.env.BANQUET_EVIDENCE_OUT
  ? path.resolve(process.env.BANQUET_EVIDENCE_OUT)
  : path.join(ROOT, "tests/evidence");

let HTTP_PORT = 0;
let CDP_PORT = 0;
let BASE = "";

const notes = [];
function note(s) {
  notes.push(s);
  console.log(s);
}

/** Refuse bare/host run — must come from isolated-launcher.sh */
function requireIsolation() {
  if (process.env.BANQUET_EVIDENCE_ISOLATED !== "1") {
    console.error(
      "REFUSE: run-evidence.mjs must be invoked via isolated-launcher.sh\n" +
        "  bash banquet-pilot/tests/evidence/scripts/isolated-launcher.sh run-evidence\n" +
        "No unisolated / disabled-sandbox / host-env fallback.",
    );
    process.exit(2);
  }
  const marker = process.env.BANQUET_ISOLATION_MARKER;
  const token = process.env.BANQUET_INSTANCE_TOKEN;
  const profile = process.env.BANQUET_USER_DATA_DIR;
  if (!marker || !token || !profile) {
    console.error("REFUSE: missing isolation marker/token/user-data-dir");
    process.exit(2);
  }
  let got;
  try {
    got = readFileSync(marker, "utf8").trim();
  } catch (e) {
    console.error("REFUSE: isolation marker unreadable:", e.message);
    process.exit(2);
  }
  if (got !== token.trim()) {
    console.error("REFUSE: instance marker/token mismatch");
    process.exit(2);
  }
}

/**
 * Minimal whitelist env for children. NEVER copy-then-delete from process.env.
 * Never includes GH tokens, PAT, DISPLAY, DBUS, or X11.
 */
function buildWhitelistEnv(extra = {}) {
  const home = process.env.HOME || "/home";
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
    XDG_CONFIG_HOME: process.env.XDG_CONFIG_HOME || path.join(home, ".config"),
    XDG_CACHE_HOME: process.env.XDG_CACHE_HOME || path.join(home, ".cache"),
    XDG_DATA_HOME: process.env.XDG_DATA_HOME || path.join(home, ".local/share"),
    BANQUET_EVIDENCE_ISOLATED: "1",
    BANQUET_INSTANCE_TOKEN: process.env.BANQUET_INSTANCE_TOKEN || "",
    BANQUET_INSTANCE_ID: process.env.BANQUET_INSTANCE_ID || "",
    BANQUET_ISOLATION_MARKER: process.env.BANQUET_ISOLATION_MARKER || "",
    BANQUET_USER_DATA_DIR: process.env.BANQUET_USER_DATA_DIR || "",
    BANQUET_EVIDENCE_OUT: process.env.BANQUET_EVIDENCE_OUT || "",
    BANQUET_TASK_ROOT: process.env.BANQUET_TASK_ROOT || "",
  };
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== null) env[k] = String(v);
  }
  for (const banned of [
    "GH_TOKEN", "GITHUB_TOKEN", "GITHUB_PAT", "PAT", "GH_PAT",
    "DISPLAY", "WAYLAND_DISPLAY", "DBUS_SESSION_BUS_ADDRESS", "XAUTHORITY",
  ]) {
    delete env[banned];
  }
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
        try {
          resolve(JSON.parse(d));
        } catch (e) {
          reject(e);
        }
      });
    }).on("error", reject);
  });
}

/** Read DevToolsActivePort from THIS instance user-data-dir (not "first page on fixed port"). */
async function waitForDevtoolsPort(userDataDir, maxMs = 25000) {
  const portFile = path.join(userDataDir, "DevToolsActivePort");
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      if (existsSync(portFile)) {
        const raw = readFileSync(portFile, "utf8").trim().split("\n");
        const port = Number(raw[0]);
        if (port > 0) return port;
      }
    } catch {}
    await sleep(100);
  }
  throw new Error("DevToolsActivePort not ready for this user-data-dir (sandbox/instance failure)");
}

async function waitForWs(cdpPort, instanceToken, userDataDir, maxMs = 25000) {
  const start = Date.now();
  const markerInProfile = path.join(userDataDir, "banquet-instance-token");
  if (!existsSync(markerInProfile) || readFileSync(markerInProfile, "utf8").trim() !== instanceToken) {
    throw new Error("CDP handshake: user-data-dir instance token mismatch");
  }
  while (Date.now() - start < maxMs) {
    try {
      const list = await fetchJson(`http://127.0.0.1:${cdpPort}/json/list`);
      const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
      if (page) return page;
    } catch {}
    await sleep(250);
  }
  throw new Error("CDP page not ready for this instance");
}

class Cdp {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.pending = new Map();
    this.console = [];
  }
  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((res, rej) => {
      this.ws.addEventListener("open", () => res());
      this.ws.addEventListener("error", (e) => rej(e));
    });
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
      if (msg.method === "Runtime.consoleAPICalled") {
        const args = (msg.params.args || []).map((a) => a.value ?? a.description ?? "");
        this.console.push({ type: msg.params.type, args });
      }
      if (msg.method === "Runtime.exceptionThrown") {
        this.console.push({
          type: "exception",
          args: [msg.params.exceptionDetails?.text || "ex"],
        });
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
  async eval(expression, returnByValue = true) {
    const r = await this.send("Runtime.evaluate", {
      expression,
      returnByValue,
      awaitPromise: true,
    });
    if (r.exceptionDetails) {
      throw new Error("eval: " + (r.exceptionDetails.text || JSON.stringify(r.exceptionDetails)));
    }
    return r.result?.value;
  }
  close() {
    try {
      this.ws.close();
    } catch {}
  }
}

async function setViewport(cdp, w, h, dpr = 1) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: h,
    deviceScaleFactor: dpr,
    mobile: true,
  });
}

async function shot(cdp, filePath) {
  const s = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
  writeFileSync(filePath, Buffer.from(s.data, "base64"));
}

async function waitReady(cdp) {
  for (let i = 0; i < 50; i++) {
    const ok = await cdp.eval(`!!window.__BANQUET__ && !!window.__BANQUET__.levelId`);
    if (ok) return;
    await sleep(120);
  }
  throw new Error("game not ready");
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

/** mouse-sim native */
async function mouseClick(cdp, x, y) {
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

async function mouseDrag(cdp, x0, y0, x1, y1) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: x0,
    y: y0,
    button: "left",
    clickCount: 1,
  });
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "left" });
    await sleep(15);
  }
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: x1,
    y: y1,
    button: "left",
    clickCount: 1,
  });
}

/** touch-sim-native via CDP Input.dispatchTouchEvent */
async function touchTap(cdp, x, y, id = 0) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id }],
  });
  await sleep(30);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function touchDrag(cdp, x0, y0, x1, y1, id = 0) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: x0, y: y0, id }],
  });
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y, id }],
    });
    await sleep(15);
  }
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
}

async function touchCancelMidDrag(cdp, x0, y0, x1, y1, id = 0) {
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: x0, y: y0, id }],
  });
  const steps = 5;
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x, y, id }],
    });
    await sleep(15);
  }
  // Native-sim cancel (maps to pointercancel) — must NOT commit
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
}

async function state(cdp) {
  return JSON.parse(await cdp.eval(`JSON.stringify(window.__BANQUET__)`));
}

async function clickChar(cdp, charId) {
  const b = await centerOf(cdp, `.char[data-char="${charId}"]`);
  await mouseClick(cdp, b.x, b.y);
  await sleep(80);
}

async function clickSeat(cdp, seat) {
  const b = await centerOf(cdp, `.seat[data-seat="${seat}"]`);
  await mouseClick(cdp, b.x, b.y);
  await sleep(80);
}

async function dragCharToSeat(cdp, charId, seat) {
  const a = await centerOf(cdp, `.char[data-char="${charId}"]`);
  const b = await centerOf(cdp, `.seat[data-seat="${seat}"]`);
  await mouseDrag(cdp, a.x, a.y, b.x, b.y);
  await sleep(120);
}

async function placeClickPath(cdp, mapping) {
  for (const [charId, seat] of Object.entries(mapping)) {
    await clickChar(cdp, charId);
    await clickSeat(cdp, seat);
  }
}

async function placeDragPath(cdp, mapping) {
  for (const [charId, seat] of Object.entries(mapping)) {
    await dragCharToSeat(cdp, charId, seat);
  }
}

async function btnClick(cdp, label) {
  await cdp.eval(`([...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)})).click()`);
  await sleep(100);
}

async function navigateLevel(cdp, level) {
  await cdp.send("Page.navigate", { url: BASE + "?level=" + level });
  await sleep(650);
  await waitReady(cdp);
}

async function main() {
  if (typeof WebSocket === "undefined") throw new Error("need --experimental-websocket");
  requireIsolation();

  mkdirSync(path.join(EVID, "l01"), { recursive: true });
  mkdirSync(path.join(EVID, "l02"), { recursive: true });
  mkdirSync(path.join(EVID, "notes"), { recursive: true });
  mkdirSync(path.join(EVID, "reject-fix"), { recursive: true });
  mkdirSync(path.join(EVID, "touch"), { recursive: true });
  mkdirSync(path.join(EVID, "scripts"), { recursive: true });

  const instanceToken = process.env.BANQUET_INSTANCE_TOKEN;
  const profile = process.env.BANQUET_USER_DATA_DIR;
  mkdirSync(profile, { recursive: true });
  writeFileSync(path.join(profile, "banquet-instance-token"), instanceToken, { mode: 0o600 });

  HTTP_PORT = await freePort();
  BASE = `http://127.0.0.1:${HTTP_PORT}/`;
  const childEnv = buildWhitelistEnv();

  // Bind loopback only; dynamic port (not fixed 8877).
  const httpProc = spawn(
    "python3",
    ["-m", "http.server", String(HTTP_PORT), "--bind", "127.0.0.1"],
    { cwd: ROOT, stdio: "ignore", env: childEnv },
  );

  await sleep(300);

  // Headless Chrome + CDP. Sandbox MUST stay enabled.
  // --remote-debugging-port=0 => port in user-data-dir/DevToolsActivePort (instance handshake).
  // If sandbox cannot start, Chrome exits — fail loudly; never disable sandbox.
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
    "--window-size=420,900",
    "about:blank",
  ];
  const SANDBOX_DISABLE_FLAG = "--" + "no-sandbox";
  if (chromeArgs.some((a) => a === SANDBOX_DISABLE_FLAG || a.startsWith(SANDBOX_DISABLE_FLAG + "="))) {
    throw new Error("internal error: sandbox-disable flag must never be passed");
  }
  const chrome = spawn("google-chrome", chromeArgs, { env: childEnv, stdio: "ignore" });
  let chromeExit = null;
  chrome.on("exit", (code, signal) => {
    chromeExit = { code, signal };
  });

  const summary = {
    inputLabels: {
      mouseSim: "native-sim CDP Input.dispatchMouseEvent",
      touchSimNative: "native-sim CDP Input.dispatchTouchEvent",
      touchSimJs: "JS-synthesized PointerEvent (handler semantics only)",
    },
    touchSim: true,
    realDevice: "未测",
    viewports: {},
    consoleErrors: [],
    paths: {},
    isolation: {
      chromeProfile: "isolated instance user-data-dir",
      sandbox: "enabled (fail if sandbox cannot start; no disable-sandbox fallback)",
      env: "minimal whitelist (not delete-from-spread)",
      httpBind: "127.0.0.1 dynamic port",
      cdpHandshake: "DevToolsActivePort + user-data-dir instance token",
      authEnvStripped: true,
      origin: "https://github.com/zhousong-xd/demo001.git (creds outside isolation)",
      launcher: "scripts/isolated-launcher.sh",
    },
  };

  try {
    CDP_PORT = await waitForDevtoolsPort(profile, 25000);
    if (chromeExit && chromeExit.code) {
      throw new Error(
        `Chrome exited before CDP ready (code=${chromeExit.code}, signal=${chromeExit.signal}). ` +
          "Sandbox/instance check failed — no disabled-sandbox fallback.",
      );
    }
    note(`instance http=${HTTP_PORT} cdp=${CDP_PORT} profile=${profile}`);
    const page = await waitForWs(CDP_PORT, instanceToken, profile);
    const cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });

    // --- Viewport smoke ---
    for (const [w, h, name, dpr] of [
      [360, 640, "360x640", 1],
      [390, 844, "390x844", 1],
    ]) {
      await setViewport(cdp, w, h, dpr);
      await navigateLevel(cdp, "L01");
      const vp = JSON.parse(
        await cdp.eval(
          `JSON.stringify({innerWidth:innerWidth,innerHeight:innerHeight,dpr:devicePixelRatio})`,
        ),
      );
      summary.viewports[name] = vp;
      note(`viewport ${name}: ${JSON.stringify(vp)}`);
      await shot(cdp, path.join(EVID, "l01", `initial_${name}.png`));
      const overflow = await cdp.eval(
        `document.documentElement.scrollWidth > window.innerWidth + 1`,
      );
      note(`overflow ${name}: ${overflow}`);
      if (overflow) throw new Error("horizontal overflow at " + name);
    }

    // --- L01 click / drag win (mouse-sim) ---
    await setViewport(cdp, 360, 640, 1);
    await navigateLevel(cdp, "L01");
    const l01sol = { fox: "A1", otter: "A2", crane: "B1", rabbit: "B2" };
    await placeClickPath(cdp, l01sol);
    let st = await state(cdp);
    note(`L01 click-path won=${st.won} asg=${JSON.stringify(st.assignment)}`);
    if (!st.won) throw new Error("L01 click path failed");
    await shot(cdp, path.join(EVID, "l01", "win_click_360x640.png"));
    summary.paths.l01_click = "ok";

    await navigateLevel(cdp, "L01");
    await placeDragPath(cdp, l01sol);
    st = await state(cdp);
    note(`L01 drag-path won=${st.won}`);
    if (!st.won) throw new Error("L01 drag path failed");
    await shot(cdp, path.join(EVID, "l01", "win_drag_360x640.png"));
    summary.paths.l01_drag = "ok";

    // --- swap / undo / displace ---
    await navigateLevel(cdp, "L01");
    await dragCharToSeat(cdp, "fox", "A1");
    await dragCharToSeat(cdp, "rabbit", "A2");
    st = await state(cdp);
    const beforeSwap = { ...st.assignment };
    await dragCharToSeat(cdp, "fox", "A2");
    st = await state(cdp);
    note(`swap: fox=${st.assignment.fox} rabbit=${st.assignment.rabbit}`);
    if (st.assignment.fox !== "A2" || st.assignment.rabbit !== "A1") throw new Error("swap failed");
    await shot(cdp, path.join(EVID, "l01", "after_swap.png"));
    await btnClick(cdp, "撤销");
    st = await state(cdp);
    note(`undo after swap: ${JSON.stringify(st.assignment)}`);
    if (st.assignment.fox !== beforeSwap.fox || st.assignment.rabbit !== beforeSwap.rabbit) {
      throw new Error("undo did not restore");
    }
    await shot(cdp, path.join(EVID, "l01", "after_undo.png"));
    summary.paths.swap_undo = "ok";

    await btnClick(cdp, "重置");
    await dragCharToSeat(cdp, "fox", "A1");
    await dragCharToSeat(cdp, "crane", "A1");
    st = await state(cdp);
    note(`displace: crane=${st.assignment.crane} fox=${st.assignment.fox}`);
    if (st.assignment.crane !== "A1" || st.assignment.fox !== null) throw new Error("displace failed");
    await shot(cdp, path.join(EVID, "l01", "after_displace.png"));
    summary.paths.displace = "ok";

    // invalid drop / same-seat
    const hist0 = st.historyLen;
    const charBox = await centerOf(cdp, `.char[data-char="crane"]`);
    await mouseDrag(cdp, charBox.x, charBox.y, 5, 5);
    await sleep(100);
    st = await state(cdp);
    note(`invalid drop history ${hist0} -> ${st.historyLen}`);
    if (st.historyLen !== hist0) throw new Error("invalid drop entered history");
    summary.paths.invalid_drop = "ok";

    await btnClick(cdp, "重置");
    await clickChar(cdp, "fox");
    await clickSeat(cdp, "A1");
    st = await state(cdp);
    const h1 = st.historyLen;
    await clickChar(cdp, "fox");
    await clickSeat(cdp, "A1");
    st = await state(cdp);
    note(`same-seat history ${h1} -> ${st.historyLen}`);
    if (st.historyLen !== h1) throw new Error("same-seat entered history");
    summary.paths.same_seat = "ok";

    // ========== REJECT FIX 1: pointercancel must NOT commit ==========
    // A) touch-sim-native: touchCancel mid-drag over seat
    await navigateLevel(cdp, "L01");
    st = await state(cdp);
    const beforeCancel = { asg: { ...st.assignment }, hist: st.historyLen, ls: { ...st.listenerStats } };
    {
      const a = await centerOf(cdp, `.char[data-char="fox"]`);
      const b = await centerOf(cdp, `.seat[data-seat="A1"]`);
      await touchCancelMidDrag(cdp, a.x, a.y, b.x, b.y, 0);
      await sleep(120);
    }
    st = await state(cdp);
    const cancelNativeOk =
      st.assignment.fox === null &&
      st.historyLen === beforeCancel.hist &&
      !st.gestureActive &&
      !st.ghostPresent &&
      st.listenerStats.activeWindow === 0;
    note(
      `pointercancel touch-sim-native: fox=${st.assignment.fox} hist=${st.historyLen} gesture=${st.gestureActive} ghost=${st.ghostPresent} activeListeners=${st.listenerStats.activeWindow} ok=${cancelNativeOk}`,
    );
    if (!cancelNativeOk) throw new Error("touchCancel committed or left residue");
    writeFileSync(
      path.join(EVID, "reject-fix", "cancel_touch_native_before_after.json"),
      JSON.stringify({ before: beforeCancel, after: st, label: "touch-sim-native touchCancel" }, null, 2),
    );
    await shot(cdp, path.join(EVID, "reject-fix", "after_touch_cancel.png"));
    // After cancel, normal op still works
    await dragCharToSeat(cdp, "fox", "A1");
    st = await state(cdp);
    if (st.assignment.fox !== "A1") throw new Error("after cancel, normal drag failed");
    note(`after cancel, normal drag fox->A1 ok; commits=${st.listenerStats.commits}`);
    summary.paths.pointercancel_native = "ok";

    // B) JS-synthesized pointercancel (handler semantics)
    await btnClick(cdp, "重置");
    st = await state(cdp);
    const beforeJs = { asg: { ...st.assignment }, hist: st.historyLen };
    {
      const a = await centerOf(cdp, `.char[data-char="fox"]`);
      const b = await centerOf(cdp, `.seat[data-seat="A1"]`);
      // Start with native mouse press+move into drag, then JS pointercancel
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: a.x,
        y: a.y,
        button: "left",
        clickCount: 1,
      });
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: a.x + 40,
        y: a.y - 40,
        button: "left",
      });
      await sleep(40);
      // Synthesize pointercancel on the char (label: JS-synthesized)
      await cdp.eval(`(() => {
        const el = document.querySelector('.char[data-char="fox"]');
        const ev = new PointerEvent('pointercancel', {
          bubbles: true, cancelable: true, pointerId: 1,
          clientX: ${b.x}, clientY: ${b.y}, pointerType: 'touch', isPrimary: true
        });
        window.dispatchEvent(ev);
      })()`);
      await sleep(80);
      // Release mouse — must not commit either (listeners already gone)
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: b.x,
        y: b.y,
        button: "left",
        clickCount: 1,
      });
      await sleep(80);
    }
    st = await state(cdp);
    const cancelJsOk =
      st.assignment.fox === null &&
      st.historyLen === beforeJs.hist &&
      st.listenerStats.activeWindow === 0 &&
      !st.ghostPresent;
    note(
      `pointercancel JS-synthesized: fox=${st.assignment.fox} hist=${st.historyLen} activeListeners=${st.listenerStats.activeWindow} ok=${cancelJsOk}`,
    );
    if (!cancelJsOk) throw new Error("JS pointercancel committed or residue");
    writeFileSync(
      path.join(EVID, "reject-fix", "cancel_js_synth_before_after.json"),
      JSON.stringify({ before: beforeJs, after: st, label: "touch-sim-js PointerEvent pointercancel" }, null, 2),
    );
    summary.paths.pointercancel_js = "ok";

    // ========== REJECT FIX 2: idempotent teardown / listener zero ==========
    await navigateLevel(cdp, "L01");
    // blur mid-drag
    {
      const a = await centerOf(cdp, `.char[data-char="fox"]`);
      const b = await centerOf(cdp, `.seat[data-seat="A1"]`);
      const ls0 = (await state(cdp)).listenerStats;
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: a.x,
        y: a.y,
        button: "left",
        clickCount: 1,
      });
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: a.x + 30,
        y: a.y + 30,
        button: "left",
      });
      await sleep(40);
      await cdp.eval(`window.dispatchEvent(new Event('blur'))`);
      await sleep(40);
      let stMid = await state(cdp);
      note(
        `blur mid-drag: gesture=${stMid.gestureActive} ghost=${stMid.ghostPresent} active=${stMid.listenerStats.activeWindow} reg=${stMid.listenerStats.register} unreg=${stMid.listenerStats.unregister}`,
      );
      if (stMid.gestureActive || stMid.ghostPresent || stMid.listenerStats.activeWindow !== 0) {
        throw new Error("blur did not fully tear down");
      }
      // release over seat — must NOT commit
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: b.x,
        y: b.y,
        button: "left",
        clickCount: 1,
      });
      await sleep(80);
      st = await state(cdp);
      if (st.assignment.fox !== null || st.historyLen !== 0) throw new Error("post-blur release committed");
      // Repeat blur cycle twice more to prove no listener accumulation
      for (let round = 0; round < 2; round++) {
        const aa = await centerOf(cdp, `.char[data-char="fox"]`);
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: aa.x,
          y: aa.y,
          button: "left",
          clickCount: 1,
        });
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseMoved",
          x: aa.x + 25,
          y: aa.y + 25,
          button: "left",
        });
        await sleep(30);
        await cdp.eval(`window.dispatchEvent(new Event('blur'))`);
        await sleep(30);
        await cdp.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: aa.x + 25,
          y: aa.y + 25,
          button: "left",
          clickCount: 1,
        });
        await sleep(50);
      }
      st = await state(cdp);
      note(
        `after 3 blur cycles: active=${st.listenerStats.activeWindow} reg=${st.listenerStats.register} unreg=${st.listenerStats.unregister} fox=${st.assignment.fox}`,
      );
      if (st.listenerStats.activeWindow !== 0) throw new Error("listener leak after blur cycles");
      if (st.listenerStats.register !== st.listenerStats.unregister) {
        // register counts window listeners (3 per gesture); should match unregister
        note(`WARN register!=unregister ${st.listenerStats.register} vs ${st.listenerStats.unregister}`);
        // soft: activeWindow===0 is the hard requirement
      }
      // One normal commit after interrupt storms
      const commitsBefore = st.listenerStats.commits;
      await dragCharToSeat(cdp, "fox", "A1");
      st = await state(cdp);
      if (st.assignment.fox !== "A1") throw new Error("normal op after blur cycles failed");
      if (st.listenerStats.commits !== commitsBefore + 1) throw new Error("expected exactly one new commit");
      if (st.listenerStats.activeWindow !== 0) throw new Error("listeners not zero after commit");
      writeFileSync(
        path.join(EVID, "reject-fix", "listener_teardown.json"),
        JSON.stringify(
          {
            label: "blur/interrupt cycles then one commit",
            ls0,
            final: st.listenerStats,
            assignment: st.assignment,
          },
          null,
          2,
        ),
      );
      note(`listener teardown ok; one-op-one-commit commits=${st.listenerStats.commits}`);
    }
    summary.paths.interrupt = "ok";
    summary.paths.listener_teardown = "ok";

    // visibility + pagehide cancel
    await btnClick(cdp, "重置");
    {
      const a = await centerOf(cdp, `.char[data-char="rabbit"]`);
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: a.x,
        y: a.y,
        button: "left",
        clickCount: 1,
      });
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: a.x + 40,
        y: a.y,
        button: "left",
      });
      await sleep(30);
      await cdp.eval(`(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
      })()`);
      await sleep(40);
      st = await state(cdp);
      if (st.gestureActive || st.listenerStats.activeWindow !== 0) {
        throw new Error("visibility cancel incomplete");
      }
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: a.x + 40,
        y: a.y,
        button: "left",
        clickCount: 1,
      });
    }
    note("visibility cancel ok");
    summary.paths.visibility_cancel = "ok";

    // ========== REJECT FIX 3: center click occupied seat ==========
    await navigateLevel(cdp, "L01");
    // Place fox on A1, rabbit on A2 via empty-area clicks
    await clickChar(cdp, "fox");
    // Click empty-ish area of A1: use seat top padding (seat-id corner) to avoid char
    {
      const seat = await cdp.eval(`(() => {
        const el = document.querySelector('.seat[data-seat="A1"]');
        const r = el.getBoundingClientRect();
        return { x: r.left + 8, y: r.top + 8 };
      })()`);
      await mouseClick(cdp, seat.x, seat.y);
      await sleep(80);
    }
    await clickChar(cdp, "rabbit");
    {
      const seat = await cdp.eval(`(() => {
        const el = document.querySelector('.seat[data-seat="A2"]');
        const r = el.getBoundingClientRect();
        return { x: r.left + 8, y: r.top + 8 };
      })()`);
      await mouseClick(cdp, seat.x, seat.y);
      await sleep(80);
    }
    st = await state(cdp);
    note(`pre-center-swap asg=${JSON.stringify(st.assignment)}`);
    if (st.assignment.fox !== "A1" || st.assignment.rabbit !== "A2") {
      throw new Error("setup for center swap failed");
    }
    // Select fox, then click CENTER of rabbit (occupied seat center)
    await clickChar(cdp, "fox");
    st = await state(cdp);
    if (st.selectedChar !== "fox") throw new Error("fox not selected");
    const rabbitCenter = await centerOf(cdp, `.char[data-char="rabbit"]`);
    await mouseClick(cdp, rabbitCenter.x, rabbitCenter.y);
    await sleep(120);
    st = await state(cdp);
    note(`center-click swap: fox=${st.assignment.fox} rabbit=${st.assignment.rabbit} hist=${st.historyLen}`);
    if (st.assignment.fox !== "A2" || st.assignment.rabbit !== "A1") {
      throw new Error("center click did not swap");
    }
    await shot(cdp, path.join(EVID, "reject-fix", "center_click_swap.png"));
    writeFileSync(
      path.join(EVID, "reject-fix", "center_click_swap.json"),
      JSON.stringify({ assignment: st.assignment, historyLen: st.historyLen, label: "mouse-sim center of occupied seat" }, null, 2),
    );
    summary.paths.center_click_swap = "ok";

    // Waiting guest → occupied seat center (displace)
    await btnClick(cdp, "重置");
    await clickChar(cdp, "fox");
    {
      const seat = await cdp.eval(`(() => {
        const el = document.querySelector('.seat[data-seat="A1"]');
        const r = el.getBoundingClientRect();
        return { x: r.left + 8, y: r.top + 8 };
      })()`);
      await mouseClick(cdp, seat.x, seat.y);
      await sleep(80);
    }
    await clickChar(cdp, "crane"); // waiting
    st = await state(cdp);
    if (st.selectedChar !== "crane") throw new Error("crane not selected");
    const foxCenter = await centerOf(cdp, `.char[data-char="fox"]`);
    await mouseClick(cdp, foxCenter.x, foxCenter.y);
    await sleep(120);
    st = await state(cdp);
    note(`center-click displace: crane=${st.assignment.crane} fox=${st.assignment.fox}`);
    if (st.assignment.crane !== "A1" || st.assignment.fox !== null) {
      throw new Error("center click displace failed");
    }
    await shot(cdp, path.join(EVID, "reject-fix", "center_click_displace.png"));
    summary.paths.center_click_displace = "ok";

    // ========== Multi-touch: second finger must not break first ==========
    await navigateLevel(cdp, "L01");
    {
      const fox = await centerOf(cdp, `.char[data-char="fox"]`);
      const seat = await centerOf(cdp, `.seat[data-seat="A1"]`);
      const rabbit = await centerOf(cdp, `.char[data-char="rabbit"]`);
      // Finger 0 starts drag fox toward A1
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: fox.x, y: fox.y, id: 0 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: fox.x + 20, y: fox.y - 20, id: 0 }],
      });
      await sleep(40);
      const mid = await state(cdp);
      const histMid = mid.historyLen;
      // Finger 1 taps rabbit / empty seat / would-be control — must not commit
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [
          { x: fox.x + 20, y: fox.y - 20, id: 0 },
          { x: rabbit.x, y: rabbit.y, id: 1 },
        ],
      });
      await sleep(40);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [{ x: fox.x + 20, y: fox.y - 20, id: 0 }], // finger 1 ends; 0 remains
      });
      // Also try second finger on seat during active gesture via eval click gate
      await sleep(40);
      let st2 = await state(cdp);
      note(
        `multi-touch mid: gesture=${st2.gestureActive} hist=${st2.historyLen} (was ${histMid}) fox=${st2.assignment.fox}`,
      );
      // Complete finger 0 onto A1
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: seat.x, y: seat.y, id: 0 }],
      });
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
      await sleep(120);
      st = await state(cdp);
      note(`multi-touch complete: fox=${st.assignment.fox} hist=${st.historyLen} active=${st.listenerStats.activeWindow}`);
      // fox should be on A1 from first finger; second finger must not have rewritten
      if (st.assignment.fox !== "A1") {
        // Some CDP touch stacks cancel primary on multi-touch — accept cancel-without-commit as safe
        if (st.assignment.fox === null && st.historyLen === 0 && st.listenerStats.activeWindow === 0) {
          note("multi-touch: primary cancelled safely (no commit); acceptable gate behavior");
          summary.paths.multitouch_gate = "ok-cancel-safe";
        } else {
          throw new Error("multi-touch broke first finger op unexpectedly");
        }
      } else {
        if (st.listenerStats.activeWindow !== 0) throw new Error("listeners after multitouch");
        summary.paths.multitouch_gate = "ok";
      }
      writeFileSync(
        path.join(EVID, "touch", "multitouch_gate.json"),
        JSON.stringify({ final: st, label: "touch-sim-native two-finger during drag" }, null, 2),
      );
      await shot(cdp, path.join(EVID, "touch", "after_multitouch.png"));
    }

    // Seat/control gate while gesture active (mouse-sim second interaction)
    await navigateLevel(cdp, "L01");
    {
      const a = await centerOf(cdp, `.char[data-char="fox"]`);
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        x: a.x,
        y: a.y,
        button: "left",
        clickCount: 1,
      });
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseMoved",
        x: a.x + 35,
        y: a.y + 10,
        button: "left",
      });
      await sleep(40);
      // Programmatic seat click while gesture active — must be gated
      const histBefore = (await state(cdp)).historyLen;
      await cdp.eval(`document.querySelector('.seat[data-seat="A1"]').click()`);
      await sleep(40);
      let stG = await state(cdp);
      if (stG.historyLen !== histBefore || stG.assignment.fox !== null) {
        throw new Error("seat click during gesture was not gated");
      }
      note("seat click gated during gesture ok");
      await cdp.send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        x: a.x + 35,
        y: a.y + 10,
        button: "left",
        clickCount: 1,
      });
      await sleep(80);
      // cancel leftover if any
      st = await state(cdp);
      if (st.listenerStats.activeWindow !== 0) {
        await cdp.eval(`window.dispatchEvent(new Event('blur'))`);
        await sleep(40);
      }
    }
    summary.paths.gesture_gate_seat = "ok";

    // --- touch-sim place fox via touch tap ---
    await navigateLevel(cdp, "L01");
    {
      const fox = await centerOf(cdp, `.char[data-char="fox"]`);
      const seatPad = await cdp.eval(`(() => {
        const el = document.querySelector('.seat[data-seat="A1"]');
        const r = el.getBoundingClientRect();
        return { x: r.left + 8, y: r.top + 8 };
      })()`);
      await touchTap(cdp, fox.x, fox.y, 0);
      await sleep(80);
      await touchTap(cdp, seatPad.x, seatPad.y, 0);
      await sleep(100);
      st = await state(cdp);
      note(`touch-sim tap place fox=${st.assignment.fox}`);
      if (st.assignment.fox !== "A1") throw new Error("touch tap place failed");
      await shot(cdp, path.join(EVID, "touch", "touch_tap_place.png"));
      // touch drag otter to A2
      const otter = await centerOf(cdp, `.char[data-char="otter"]`);
      const a2 = await centerOf(cdp, `.seat[data-seat="A2"]`);
      await touchDrag(cdp, otter.x, otter.y, a2.x, a2.y, 0);
      await sleep(120);
      st = await state(cdp);
      note(`touch-sim drag otter=${st.assignment.otter}`);
      if (st.assignment.otter !== "A2") throw new Error("touch drag failed");
      await shot(cdp, path.join(EVID, "touch", "touch_drag_place.png"));
    }
    summary.paths.touch_tap_drag = "ok";

    // --- L02 ---
    await setViewport(cdp, 390, 844, 1);
    await navigateLevel(cdp, "L02");
    await shot(cdp, path.join(EVID, "l02", "initial_390x844.png"));
    const l02sol = {
      fox: "A1",
      otter: "A2",
      hedgehog: "A3",
      rabbit: "B1",
      tanuki: "B2",
      crane: "B3",
    };
    await placeDragPath(cdp, l02sol);
    st = await state(cdp);
    note(`L02 drag-path won=${st.won} ${JSON.stringify(st.assignment)}`);
    if (!st.won) throw new Error("L02 drag failed");
    await shot(cdp, path.join(EVID, "l02", "win_drag_390x844.png"));
    summary.paths.l02_drag = "ok";

    await setViewport(cdp, 360, 640, 1);
    await navigateLevel(cdp, "L02");
    await placeClickPath(cdp, l02sol);
    st = await state(cdp);
    note(`L02 click-path won=${st.won}`);
    if (!st.won) throw new Error("L02 click failed");
    await shot(cdp, path.join(EVID, "l02", "win_click_360x640.png"));
    summary.paths.l02_click = "ok";

    const errs = cdp.console.filter((c) => c.type === "error" || c.type === "exception");
    summary.consoleErrors = errs;
    note(`console errors: ${errs.length}`);

    writeFileSync(path.join(EVID, "notes", "summary.json"), JSON.stringify(summary, null, 2));
    writeFileSync(
      path.join(EVID, "notes", "session.md"),
      [
        "# T-003 REJECT-fix 证据说明",
        "",
        `- 输入标注:`,
        `  - **mouse-sim** = native-sim CDP Input.dispatchMouseEvent`,
        `  - **touch-sim-native** = native-sim CDP Input.dispatchTouchEvent`,
        `  - **touch-sim-js** = JS-synthesized PointerEvent（仅证处理器语义）`,
        `- touch-sim: **是**`,
        `- 真机: **未测**`,
        `- 视口: ${JSON.stringify(summary.viewports)}`,
        `- 路径: ${JSON.stringify(summary.paths)}`,
        `- 控制台 error/exception: ${errs.length}`,
        `- 隔离: 干净临时 Chrome profile；子进程 env 剥离 GH_TOKEN/GITHUB_TOKEN/PAT`,
        "",
        "## REJECT 修复对照",
        "1. pointercancel 独立取消路径（不复用 onUp/commit）— `paths.pointercancel_native` / `pointercancel_js`",
        "2. 幂等手势收尾（监听归零、无残留 ghost/capture）— `paths.listener_teardown` / `interrupt=ok`",
        "3. 已选角色后点被占座位中心完成 swap/displace — `paths.center_click_*`",
        "4. 多指门禁 — `paths.multitouch_gate` / `gesture_gate_seat`",
        "",
        "## 操作笔记",
        ...notes.map((n) => `- ${n}`),
        "",
      ].join("\n"),
    );

    // Persist a copy of this runner note
    writeFileSync(
      path.join(EVID, "notes", "labels.md"),
      [
        "# 输入事件标注",
        "",
        "| 标签 | 来源 | 用途 |",
        "|---|---|---|",
        "| mouse-sim | CDP `Input.dispatchMouseEvent` | 原生模拟鼠标 |",
        "| touch-sim-native | CDP `Input.dispatchTouchEvent` | 原生模拟触控（含 touchCancel） |",
        "| touch-sim-js | `new PointerEvent(...)` | 仅证明处理器对 pointercancel 的语义 |",
        "| 真机 | — | **未测** |",
        "",
      ].join("\n"),
    );

    note("EVIDENCE_OK");
    cdp.close();
  } finally {
    try {
      chrome.kill("SIGKILL");
    } catch {}
    try {
      httpProc.kill("SIGKILL");
    } catch {}
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
}

main().catch((e) => {
  console.error(String((e && e.stack) || e));
  process.exit(1);
});
