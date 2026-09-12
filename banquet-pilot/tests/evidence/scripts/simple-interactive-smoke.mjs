/**
 * T-003 simple-local interactive smoke (no isolation suite).
 * mouse-sim: CDP Input.dispatchMouseEvent
 * touch-sim: not run in this script
 * 真机: 未测
 *
 * Run from repo root:
 *   node --experimental-websocket banquet-pilot/tests/evidence/scripts/simple-interactive-smoke.mjs
 *
 * Does NOT use isolated-launcher / BANQUET_EVIDENCE_ISOLATED.
 * Chrome sandbox stays ON (never --no-sandbox). Auth tokens never passed to children.
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../.."); // banquet-pilot
const EVID = path.join(ROOT, "tests/evidence/simple-interactive");
const REPO = path.resolve(ROOT, "..");

let HTTP_PORT = 0;
let CDP_PORT = 0;
let BASE = "";

const notes = [];
function note(s) {
  notes.push(s);
  console.log(s);
}

/** Minimal whitelist env for http.server / Chrome — never copy process.env. */
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
    XDG_CONFIG_HOME: path.join(tmp, "banquet-simple-xdg-config"),
    XDG_CACHE_HOME: path.join(tmp, "banquet-simple-xdg-cache"),
    XDG_DATA_HOME: path.join(tmp, "banquet-simple-xdg-data"),
  };
  // Headless Chrome does not need DISPLAY; omit auth/X11.
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== null) env[k] = String(v);
  }
  for (const banned of [
    "GH_TOKEN",
    "GITHUB_TOKEN",
    "GITHUB_PAT",
    "PAT",
    "GH_PAT",
    "DISPLAY",
    "WAYLAND_DISPLAY",
    "DBUS_SESSION_BUS_ADDRESS",
    "XAUTHORITY",
    "BANQUET_EVIDENCE_ISOLATED",
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
    this.console = [];
    this.pageErrors = [];
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
      if (msg.method === "Runtime.consoleAPICalled") {
        const args = (msg.params.args || []).map(
          (a) => a.value ?? a.description ?? "",
        );
        this.console.push({ type: msg.params.type, args });
      }
      if (msg.method === "Runtime.exceptionThrown") {
        const text = msg.params.exceptionDetails?.text || "ex";
        this.console.push({ type: "exception", args: [text] });
        this.pageErrors.push(text);
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

async function setViewport(cdp, w, h, dpr = 1) {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: w,
    height: h,
    deviceScaleFactor: dpr,
    mobile: true,
  });
}

async function shot(cdp, filePath) {
  const s = await cdp.send("Page.captureScreenshot", {
    format: "png",
    fromSurface: true,
  });
  writeFileSync(filePath, Buffer.from(s.data, "base64"));
}

async function waitReady(cdp) {
  for (let i = 0; i < 60; i++) {
    const ok = await cdp.eval(
      `!!window.__BANQUET__ && !!window.__BANQUET__.levelId`,
    );
    if (ok) return;
    await sleep(100);
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

/** mouse-sim */
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
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button: "left",
    });
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

async function mouseDragMidNoRelease(cdp, x0, y0, x1, y1) {
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: x0,
    y: y0,
    button: "left",
    clickCount: 1,
  });
  const steps = 6;
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((x1 - x0) * i) / steps;
    const y = y0 + ((y1 - y0) * i) / steps;
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x,
      y,
      button: "left",
    });
    await sleep(15);
  }
}

async function state(cdp) {
  return JSON.parse(await cdp.eval(`JSON.stringify(window.__BANQUET__)`));
}

async function clickChar(cdp, charId) {
  const b = await centerOf(cdp, `.char[data-char="${charId}"]`);
  await mouseClick(cdp, b.x, b.y);
  await sleep(40);
}

async function clickSeat(cdp, seat) {
  // Prefer empty padding near seat-id to avoid clicking an occupant center.
  const pt = await cdp.eval(`(() => {
    const el = document.querySelector('.seat[data-seat=${JSON.stringify(seat)}]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + 8, y: r.top + 8 };
  })()`);
  if (!pt) throw new Error("missing seat " + seat);
  await mouseClick(cdp, pt.x, pt.y);
  await sleep(40);
}

async function dragCharToSeat(cdp, charId, seat) {
  const a = await centerOf(cdp, `.char[data-char="${charId}"]`);
  const b = await centerOf(cdp, `.seat[data-seat="${seat}"]`);
  await mouseDrag(cdp, a.x, a.y, b.x, b.y);
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
  await sleep(60);
}

async function navigateLevel(cdp, level) {
  await cdp.send("Page.navigate", { url: BASE + "?level=" + level });
  await waitReady(cdp);
  await sleep(80);
}

async function main() {
  if (typeof WebSocket === "undefined") {
    console.error(
      "Need WebSocket: run with node --experimental-websocket …",
    );
    process.exit(1);
  }

  mkdirSync(EVID, { recursive: true });
  const profile = mkdtempSync(path.join(os.tmpdir(), "banquet-simple-ud-"));
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
    "--window-size=420,900",
    "about:blank",
  ];
  const SANDBOX_DISABLE = "--" + "no-sandbox";
  if (
    chromeArgs.some(
      (a) => a === SANDBOX_DISABLE || a.startsWith(SANDBOX_DISABLE + "="),
    )
  ) {
    throw new Error("internal: sandbox-disable flag must never be passed");
  }

  const chrome = spawn("google-chrome", chromeArgs, {
    env: childEnv,
    stdio: ["ignore", "ignore", "pipe"],
  });
  let chromeExit = null;
  let chromeErr = "";
  chrome.stderr.on("data", (d) => {
    chromeErr += d.toString();
  });
  chrome.on("exit", (code, signal) => {
    chromeExit = { code, signal };
  });

  const summary = {
    task: "T-003",
    mode: "simple-local",
    inputLabels: {
      mouseSim: "yes — CDP Input.dispatchMouseEvent",
      touchSim: "未跑",
      realDevice: "真机未测",
    },
    chrome: {
      sandbox: "enabled",
      headless: "new",
      isolationLauncher: false,
      BANQUET_EVIDENCE_ISOLATED: false,
    },
    consoleErrors: [],
    paths: {},
    notes: [],
  };

  let cdp;
  try {
    const devtools = await waitForDevtoolsEndpoint(profile, 30000);
    CDP_PORT = devtools.port;
    if (chromeExit && chromeExit.code) {
      throw new Error(
        `Chrome exited before CDP ready (code=${chromeExit.code}). stderr=${chromeErr.slice(0, 400)}`,
      );
    }
    note(`simple-local http=${HTTP_PORT} cdp=${CDP_PORT} profile=${profile}`);
    const page = await waitForPage(CDP_PORT);
    cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.connect();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");

    await setViewport(cdp, 360, 640, 1);

    // --- L01 click-path win ---
    await navigateLevel(cdp, "L01");
    const l01sol = { fox: "A1", otter: "A2", crane: "B1", rabbit: "B2" };
    await placeClickPath(cdp, l01sol);
    let st = await state(cdp);
    note(
      `L01 click-path won=${st.won} hist=${st.historyLen} asg=${JSON.stringify(st.assignment)}`,
    );
    if (!st.won) throw new Error("L01 click path failed");
    await shot(cdp, path.join(EVID, "L01_click_win.png"));
    summary.paths.l01_click_win = {
      ok: true,
      won: st.won,
      assignment: st.assignment,
      historyLen: st.historyLen,
    };

    // --- L02 click-path win ---
    await navigateLevel(cdp, "L02");
    const l02sol = {
      fox: "A1",
      otter: "A2",
      hedgehog: "A3",
      rabbit: "B1",
      tanuki: "B2",
      crane: "B3",
    };
    await placeClickPath(cdp, l02sol);
    st = await state(cdp);
    note(
      `L02 click-path won=${st.won} hist=${st.historyLen} asg=${JSON.stringify(st.assignment)}`,
    );
    if (!st.won) throw new Error("L02 click path failed");
    await shot(cdp, path.join(EVID, "L02_click_win.png"));
    summary.paths.l02_click_win = {
      ok: true,
      won: st.won,
      assignment: st.assignment,
      historyLen: st.historyLen,
    };

    // --- swap + undo ---
    await navigateLevel(cdp, "L01");
    await dragCharToSeat(cdp, "fox", "A1");
    await dragCharToSeat(cdp, "rabbit", "A2");
    st = await state(cdp);
    const beforeSwap = { ...st.assignment };
    const histBeforeSwap = st.historyLen;
    await dragCharToSeat(cdp, "fox", "A2");
    st = await state(cdp);
    note(`swap: fox=${st.assignment.fox} rabbit=${st.assignment.rabbit}`);
    if (st.assignment.fox !== "A2" || st.assignment.rabbit !== "A1") {
      throw new Error("swap failed");
    }
    await shot(cdp, path.join(EVID, "after_swap.png"));
    await btnClick(cdp, "撤销");
    st = await state(cdp);
    note(`undo after swap: ${JSON.stringify(st.assignment)} hist=${st.historyLen}`);
    if (
      st.assignment.fox !== beforeSwap.fox ||
      st.assignment.rabbit !== beforeSwap.rabbit
    ) {
      throw new Error("undo did not restore seats");
    }
    if (st.historyLen !== histBeforeSwap) {
      note(`undo hist note: expected ${histBeforeSwap} got ${st.historyLen}`);
    }
    await shot(cdp, path.join(EVID, "after_undo.png"));
    summary.paths.swap_undo = {
      ok: true,
      afterSwap: { fox: "A2", rabbit: "A1" },
      afterUndo: st.assignment,
      historyLen: st.historyLen,
    };

    // --- drag cancel without commit (blur mid-drag — UI cancelGesture path) ---
    await navigateLevel(cdp, "L01");
    st = await state(cdp);
    const beforeCancel = {
      fox: st.assignment.fox,
      hist: st.historyLen,
      commits: st.listenerStats.commits,
      cancels: st.listenerStats.cancels,
    };
    {
      const a = await centerOf(cdp, `.char[data-char="fox"]`);
      const b = await centerOf(cdp, `.seat[data-seat="A1"]`);
      await mouseDragMidNoRelease(cdp, a.x, a.y, b.x, b.y);
      await sleep(50);
      // Real UI cancel path: window blur mid-drag
      await cdp.eval(`window.dispatchEvent(new Event('blur'));`);
      await sleep(80);
      // Release leftover mouse button (should not commit after cancel)
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
    const cancelOk =
      st.assignment.fox === null &&
      st.historyLen === beforeCancel.hist &&
      !st.gestureActive &&
      !st.ghostPresent &&
      st.listenerStats.activeWindow === 0;
    note(
      `drag-cancel blur: fox=${st.assignment.fox} hist=${st.historyLen} gesture=${st.gestureActive} ghost=${st.ghostPresent} activeWin=${st.listenerStats.activeWindow} cancels=${st.listenerStats.cancels} ok=${cancelOk}`,
    );
    if (!cancelOk) throw new Error("drag cancel committed or left residue");
    await shot(cdp, path.join(EVID, "after_drag_cancel.png"));

    // After cancel, normal place still works
    await dragCharToSeat(cdp, "fox", "A1");
    st = await state(cdp);
    if (st.assignment.fox !== "A1") {
      throw new Error("normal drag after cancel failed");
    }
    note(`after cancel, fox->A1 ok commits=${st.listenerStats.commits}`);
    summary.paths.drag_cancel = {
      ok: true,
      method: "mouse-sim mid-drag + window blur (cancelGesture)",
      foxAfterCancel: null,
      historyUnchanged: true,
      postCancelPlaceOk: true,
    };

    // Optional cheap drag-win note on L01
    await navigateLevel(cdp, "L01");
    for (const [charId, seat] of Object.entries(l01sol)) {
      await dragCharToSeat(cdp, charId, seat);
    }
    st = await state(cdp);
    note(`L01 drag-path (optional) won=${st.won}`);
    summary.paths.l01_drag_win_optional = {
      ok: !!st.won,
      won: st.won,
    };
    if (st.won) await shot(cdp, path.join(EVID, "L01_drag_win.png"));

    // Console error tally (exceptions + error-level console)
    const errLike = cdp.console.filter(
      (c) =>
        c.type === "exception" ||
        c.type === "error" ||
        (Array.isArray(c.args) &&
          c.args.some(
            (a) =>
              typeof a === "string" &&
              /error|uncaught|failed/i.test(a) &&
              !/\[banquet\]/.test(a),
          )),
    );
    summary.consoleErrors = errLike;
    summary.consoleErrorCount = errLike.length;
    summary.consoleAllCount = cdp.console.length;
    summary.pageErrors = cdp.pageErrors;
    summary.notes = notes.slice();

    writeFileSync(path.join(EVID, "summary.json"), JSON.stringify(summary, null, 2));
    writeFileSync(
      path.join(EVID, "console_cdp.json"),
      JSON.stringify(
        { console: cdp.console, pageErrors: cdp.pageErrors },
        null,
        2,
      ),
    );

    const md = `# T-003 simple-local interactive smoke

Generated by \`scripts/simple-interactive-smoke.mjs\` (GROKBOT01).
真机未测。touch-sim 未跑。input: **mouse-sim** (CDP \`Input.dispatchMouseEvent\`).

## How to run
\`\`\`bash
# from repo root
node --test banquet-pilot/tests/test_rules.mjs banquet-pilot/tests/test_board.mjs
node --experimental-websocket banquet-pilot/tests/evidence/scripts/simple-interactive-smoke.mjs
\`\`\`

## Results
| Path | Result | Key state |
|------|--------|-----------|
| L01 click-path 通关 | ${summary.paths.l01_click_win.ok ? "ok" : "fail"} | won=${summary.paths.l01_click_win.won} |
| L02 click-path 通关 | ${summary.paths.l02_click_win.ok ? "ok" : "fail"} | won=${summary.paths.l02_click_win.won} |
| swap + undo | ${summary.paths.swap_undo.ok ? "ok" : "fail"} | seats restored after 撤销 |
| drag cancel (blur mid-drag) | ${summary.paths.drag_cancel.ok ? "ok" : "fail"} | history unchanged; no seat commit |
| L01 drag-win (optional) | ${summary.paths.l01_drag_win_optional.ok ? "ok" : "fail"} | won=${summary.paths.l01_drag_win_optional.won} |

## Inputs
- mouse-sim: **yes**
- touch-sim: **未跑**
- 真机: **未测**

## Console
- page/exception error count: **${summary.consoleErrorCount}**
- total CDP console events: ${summary.consoleAllCount}

## Environment
- python3 \`http.server\` bind 127.0.0.1 (dynamic port)
- Chrome headless=new, **sandbox ON**, fresh temp user-data-dir
- No isolated-launcher; BANQUET_EVIDENCE_ISOLATED not set
- Auth tokens never passed to Chrome/http.server/game

## Screenshots
- \`L01_click_win.png\`, \`L02_click_win.png\`
- \`after_swap.png\`, \`after_undo.png\`, \`after_drag_cancel.png\`
- optional \`L01_drag_win.png\`
`;
    writeFileSync(path.join(EVID, "NOTES.md"), md);

    note(`DONE summary written; consoleErrorCount=${summary.consoleErrorCount}`);
    if (summary.consoleErrorCount > 0) {
      console.error("WARN: console errors present", summary.consoleErrors);
      process.exitCode = 2;
    }
  } catch (e) {
    note(`FAIL: ${e.message}`);
    summary.fail = String(e && e.stack ? e.stack : e);
    writeFileSync(path.join(EVID, "summary.json"), JSON.stringify(summary, null, 2));
    writeFileSync(path.join(EVID, "NOTES.md"), `# FAIL\n\n${e.message}\n\n\`\`\`\n${notes.join("\n")}\n\`\`\`\n`);
    throw e;
  } finally {
    try {
      cdp?.close();
    } catch {}
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
  console.error(e);
  process.exit(1);
});
