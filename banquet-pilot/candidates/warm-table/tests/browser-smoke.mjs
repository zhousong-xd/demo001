import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";

const root = new URL("../", import.meta.url);
const evidence = fileURLToPath(new URL("evidence/", root));
mkdirSync(evidence, { recursive: true });
const chromePath = process.argv[2] || "C:/Program Files/Google/Chrome/Application/chrome.exe";
assert.ok(existsSync(chromePath), "Pass an existing Chrome executable; this test installs nothing");
const childEnv = Object.fromEntries(["SystemRoot", "TEMP", "TMP"].filter(key => process.env[key]).map(key => [key, process.env[key]]));
const profile = mkdtempSync(join(tmpdir(), "gpt01-warm-table-"));
const chrome = spawn(chromePath, ["--headless=new", "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0", "--user-data-dir=" + profile, "--no-first-run", "--no-default-browser-check", "--disable-background-networking", "--disable-sync", "--disable-extensions", "--metrics-recording-only", "about:blank"], { env: childEnv, stdio: "ignore", windowsHide: true });
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let socket;
let serial = 0;
const pending = new Map();
const errors = [];
const checks = [];
const requests = [];
const record = name => { checks.push(name); console.log("PASS " + name); };
try {
  let port;
  for (let attempt = 0; attempt < 150; attempt++) {
    try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split("\n")[0]; break; } catch {}
    await sleep(100);
  }
  assert.ok(port, "Chrome failed to open a dedicated debug endpoint");
  const pages = await (await fetch("http://127.0.0.1:" + port + "/json/list")).json();
  socket = new WebSocket(pages.find(page => page.type === "page").webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails);
    if (message.method === "Network.requestWillBeSent") requests.push(message.params.request.url);
    if (message.id && pending.has(message.id)) {
      const callback = pending.get(message.id); pending.delete(message.id);
      message.error ? callback.reject(new Error(JSON.stringify(message.error))) : callback.resolve(message.result);
    }
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++serial; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params }));
    setTimeout(() => { if (pending.delete(id)) reject(new Error("CDP timeout " + method)); }, 10000).unref();
  });
  const evaluate = async expression => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    assert.ok(!result.exceptionDetails, JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const snapshot = () => evaluate("window.__WARM_TABLE__.snapshot()");
  const click = async selector => {
    const point = await evaluate("(()=>{const element=document.querySelector(" + JSON.stringify(selector) + ");element.scrollIntoView({block:'center'});const rect=element.getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height*.55};})()");
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", ...point, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...point, button: "left", clickCount: 1 });
    await sleep(35);
  };
  const shot = async name => {
    const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(join(evidence, name + ".png"), Buffer.from(screenshot.data, "base64"));
  };
  const boot = async (width, height) => {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
    await send("Page.navigate", { url: new URL("index.html", root).href });
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate("!!window.__WARM_TABLE__")) break;
      await sleep(50);
    }
    await sleep(150);
    assert.equal(await evaluate("innerWidth"), width);
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
  };
  await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
  for (const [width, height] of [[390, 844], [360, 640], [1280, 900]]) {
    await boot(width, height);
    await evaluate("window.scrollTo(0,0)"); await shot("initial-" + width);
    assert.equal((await snapshot()).won, false);
    await click("#rabbit"); assert.equal((await snapshot()).selected, "rabbit");
    await click('[data-seat="B2"]'); assert.equal((await snapshot()).won, true);
    await sleep(350); await shot("win-" + width);
    await click("#undo"); assert.equal((await snapshot()).assignment.rabbit, "B1"); assert.equal((await snapshot()).won, false);
    await click("#bell"); await click("#fox"); assert.equal((await snapshot()).inventory.calm_bell, 1);
    await click("#bell"); await click("#rabbit"); assert.equal((await snapshot()).inventory.calm_bell, 0); assert.equal((await snapshot()).won, true);
    await sleep(320); await shot("calm-" + width);
    await click("#undo"); assert.equal((await snapshot()).inventory.calm_bell, 1); assert.deepEqual((await snapshot()).calm, []);
    record(width + "x" + height + " no horizontal overflow; actual mouse select/seat/win/undo/invalid bell/valid bell/undo");
  }
  await boot(390, 844);
  await click("#rabbit"); await click("#fox");
  assert.deepEqual((await snapshot()).assignment, { fox: "B1", rabbit: "A1" }); record("occupied guest click swaps atomically");
  await click("#restart"); await click("#rabbit"); await click("#waiting");
  assert.equal((await snapshot()).assignment.rabbit, null);
  await sleep(330); await click("#rabbit"); await click("#fox");
  assert.deepEqual((await snapshot()).assignment, { fox: null, rabbit: "A1" }); record("waiting entry displaces old occupant");
  await click("#restart"); await click("#motion"); assert.equal((await snapshot()).reducedMotion, true);
  await click("#rabbit"); await click('[data-seat="B2"]'); assert.equal((await snapshot()).won, true); record("reduced-motion retains gameplay");
  await click("#restart");
  await evaluate("document.getElementById('rabbit').focus()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: String.fromCharCode(13) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  assert.equal((await snapshot()).selected, "rabbit");
  await evaluate("document.querySelector('[data-seat=B2]').focus()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: String.fromCharCode(13) });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  assert.equal((await snapshot()).won, true); record("keyboard Enter selection and placement");
  await click("#restart");
  await click("#motion"); assert.equal((await snapshot()).reducedMotion, false);
  const getPoint = async (selector, vertical = .6) => evaluate("(()=>{const rect=document.querySelector(" + JSON.stringify(selector) + ").getBoundingClientRect();return {x:rect.left+rect.width/2,y:rect.top+rect.height*" + vertical + "};})()");
  await evaluate("document.getElementById('stage').scrollIntoView({block:'center'})");
  const source = await getPoint("#rabbit"); const target = await getPoint('[data-seat="B2"]');
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...source, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...target, button: "left", buttons: 1 });
  assert.equal((await snapshot()).ghostCount, 1);
  assert.equal((await snapshot()).assignment.rabbit, "B1");
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...target, button: "left", clickCount: 1 });
  assert.equal((await snapshot()).assignment.rabbit, "B2"); assert.equal((await snapshot()).ghostCount, 0); record("mouse drag preview does not commit until drop");
  await sleep(450); await click("#restart");
  await evaluate("document.getElementById('stage').scrollIntoView({block:'center'})");
  const touchStart = await getPoint("#rabbit"); const touchEnd = await getPoint('[data-seat="B2"]');
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...touchStart, id: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...touchEnd, id: 1 }] });
  assert.equal((await snapshot()).ghostCount, 1);
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert.equal((await snapshot()).won, true); assert.equal((await snapshot()).ghostCount, 0); record("CDP single-touch drag, not real device");
  await sleep(450); await click("#restart");
  await evaluate("document.getElementById('stage').scrollIntoView({block:'center'})");
  const cancelStart = await getPoint("#rabbit"); const cancelEnd = await getPoint('[data-seat="B2"]');
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...cancelStart, id: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...cancelEnd, id: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
  assert.equal((await snapshot()).assignment.rabbit, "B1"); assert.equal((await snapshot()).ghostCount, 0); record("touch cancellation restores visual state with no commit");
  await sleep(450);
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...cancelStart, id: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...cancelEnd, id: 1 }] });
  await send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...cancelEnd, id: 1 }, { x: cancelStart.x, y: cancelStart.y - 35, id: 2 }] });
  await send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  assert.equal((await snapshot()).assignment.rabbit, "B1"); assert.equal((await snapshot()).ghostCount, 0);
  assert.equal((await snapshot()).gestureActive, false); record("CDP second pointer cancels rather than double-committing; not real multi-touch");
  await sleep(450);
  await send("Input.dispatchMouseEvent", { type: "mousePressed", ...cancelStart, button: "left", clickCount: 1 });
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...cancelEnd, button: "left", buttons: 1 });
  await evaluate("window.dispatchEvent(new Event('blur'))");
  await send("Input.dispatchMouseEvent", { type: "mouseReleased", ...cancelEnd, button: "left", clickCount: 1 });
  assert.equal((await snapshot()).assignment.rabbit, "B1"); assert.equal((await snapshot()).ghostCount, 0);
  record("synthetic blur during drag clears capture/ghost without committing");
  await sleep(450);
  await evaluate("(()=>{document.getElementById('rabbit').click();document.querySelector('[data-seat=B2]').click();document.getElementById('undo').click();document.getElementById('bell').click();document.getElementById('rabbit').click();document.getElementById('restart').click();})()");
  await sleep(1800);
  assert.equal((await snapshot()).won, false); assert.equal((await snapshot()).inventory.calm_bell, 1); assert.equal((await snapshot()).ghostCount, 0);
  assert.equal((await snapshot()).activeAnimations, 0); record("rapid DOM-action stress cannot revive old victory or inventory effects");
  assert.equal(errors.length, 0, JSON.stringify(errors)); assert.equal(requests.filter(url => /^https?:/.test(url)).length, 0);
  record("zero runtime exceptions and zero HTTP asset requests");
  const summary = { ok: true, testedAt: new Date().toISOString(), checks, runtimeErrors: errors, httpRequests: 0, realDevice: "NOT TESTED", audioListening: "NOT TESTED", input: "CDP mouse, touch (including second pointer), keyboard; rapid stress uses DOM clicks; blur is synthetic", viewports: [[390, 844], [360, 640], [1280, 900]] };
  const artifact = readFileSync(new URL("index.html", root));
  summary.artifact = { path: "banquet-pilot/candidates/warm-table/index.html", bytes: artifact.length, sha256: createHash("sha256").update(artifact).digest("hex") };
  writeFileSync(join(evidence, "summary.json"), JSON.stringify(summary, null, 2) + "\n");
} catch (error) {
  writeFileSync(join(evidence, "summary.json"), JSON.stringify({ ok: false, checks, error: String(error), runtimeErrors: errors }, null, 2));
  throw error;
} finally {
  socket?.close();
  chrome.kill();
}
