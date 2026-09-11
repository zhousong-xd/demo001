/** Banquet Pilot interactive graybox (T-003).
 * Imports evaluateLevel / isWin from core — never bypasses with evaluateRule.
 */
import {
  evaluateLevel,
  isWin,
  PENDING,
  SATISFIED,
  CONFLICT,
} from "../core/index.js";
import {
  applySeatAction,
  assertBoardIntegrity,
  cloneAssignment,
  createHistory,
  createInitialAssignment,
  occupantOf,
  popHistory,
  pushHistory,
} from "./board.js";
import {
  CHAR_COLOR,
  CHAR_LABEL,
  STATUS_META,
  describeRule,
  ruleRelated,
} from "./labels.js";

const LEVEL_IDS = ["L01", "L02"];

/** @type {object|null} */
let level = null;
/** @type {Record<string, string|null>} */
let assignment = {};
/** @type {Record<string, string|null>[]} */
let history = createHistory();
/** @type {string|null} */
let selectedChar = null;
/** @type {string|null} */
let highlightRuleId = null;

/** Active gesture (single primary pointer only). */
let gesture = null; // { pointerId, charId, mode:'drag'|'tap', startX, startY, moved, ghostEl }
let suppressClickUntil = 0;

const DRAG_THRESHOLD = 8;

const app = document.getElementById("app");

function log(...args) {
  // keep console clean of secrets; useful for evidence
  console.log("[banquet]", ...args);
}

async function loadLevelJson(id) {
  const name = String(id).toLowerCase();
  const res = await fetch(`./levels/${name}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`load level ${id}: HTTP ${res.status}`);
  return res.json();
}

function resetLevel(keepHistoryClear = true) {
  assignment = createInitialAssignment(level);
  if (keepHistoryClear) history = createHistory();
  selectedChar = null;
  cancelGesture("reset");
  render();
}

async function switchLevel(id) {
  level = await loadLevelJson(id);
  history = createHistory();
  selectedChar = null;
  highlightRuleId = null;
  assignment = createInitialAssignment(level);
  cancelGesture("level-switch");
  render();
  log("level", level.id, level.title);
}

function availableSeats() {
  return level.seats.slice();
}

function commitAction(charId, seat) {
  const before = cloneAssignment(assignment);
  const result = applySeatAction(assignment, charId, seat, availableSeats());
  if (!result) {
    log("noop", charId, seat);
    return false;
  }
  pushHistory(history, before);
  assignment = result.next;
  assertBoardIntegrity(assignment, level.characters, availableSeats());
  selectedChar = null;
  log("action", result.kind, charId, "->", seat);
  render();
  return true;
}

function undo() {
  const prev = popHistory(history);
  if (!prev) return;
  assignment = prev;
  selectedChar = null;
  cancelGesture("undo");
  assertBoardIntegrity(assignment, level.characters, availableSeats());
  render();
}

function cancelGesture(reason) {
  if (!gesture) return;
  log("gesture-cancel", reason, gesture.charId);
  if (gesture.ghostEl && gesture.ghostEl.parentNode) {
    gesture.ghostEl.parentNode.removeChild(gesture.ghostEl);
  }
  const el = document.querySelector(`.char[data-char="${gesture.charId}"]`);
  if (el) el.classList.remove("dragging");
  gesture = null;
  // clear drop highlights
  document.querySelectorAll(".seat.drop-target").forEach((s) => s.classList.remove("drop-target"));
}

function evalState() {
  const result = evaluateLevel(level, assignment);
  // Win ONLY via isWin — never treat empty rules + !ok as all-green
  const won = isWin(level, assignment);
  if (!result.ok && won) {
    // should be impossible; defensive
    return { result, won: false };
  }
  // If !ok, do not present as all satisfied
  if (!result.ok) {
    return { result, won: false };
  }
  return { result, won };
}

function relatedHighlight() {
  if (!highlightRuleId || !level) return { chars: [], seats: [] };
  const rule = level.rules.find((r) => r.id === highlightRuleId);
  if (!rule) return { chars: [], seats: [] };
  return ruleRelated(rule);
}

function seatStyleArea(seat) {
  return seat; // A1, A2, ... match grid-template-areas
}

function makeCharEl(charId) {
  const el = document.createElement("div");
  el.className = "char";
  el.dataset.char = charId;
  el.style.background = CHAR_COLOR[charId] || "#aaa";
  el.textContent = CHAR_LABEL[charId] || charId.slice(0, 1);
  el.setAttribute("role", "button");
  el.setAttribute("aria-label", CHAR_LABEL[charId] || charId);
  if (selectedChar === charId) el.classList.add("selected");
  const rel = relatedHighlight();
  if (rel.chars.includes(charId)) el.classList.add("hl");

  el.addEventListener("pointerdown", onCharPointerDown);
  return el;
}

function onCharPointerDown(ev) {
  if (ev.button !== undefined && ev.button !== 0) return;
  const charId = ev.currentTarget.dataset.char;
  // multi-touch: ignore if another gesture active with different pointer
  if (gesture && gesture.pointerId !== ev.pointerId) {
    ev.preventDefault();
    return;
  }
  ev.preventDefault();
  ev.currentTarget.setPointerCapture?.(ev.pointerId);

  gesture = {
    pointerId: ev.pointerId,
    charId,
    mode: "tap",
    startX: ev.clientX,
    startY: ev.clientY,
    moved: false,
    ghostEl: null,
  };

  const onMove = (e) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    const dx = e.clientX - gesture.startX;
    const dy = e.clientY - gesture.startY;
    if (!gesture.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      gesture.moved = true;
      gesture.mode = "drag";
      selectedChar = null;
      const src = document.querySelector(`.char[data-char="${gesture.charId}"]`);
      if (src) src.classList.add("dragging");
      const ghost = document.createElement("div");
      ghost.className = "ghost";
      ghost.style.background = CHAR_COLOR[gesture.charId] || "#aaa";
      ghost.textContent = CHAR_LABEL[gesture.charId] || "?";
      document.body.appendChild(ghost);
      gesture.ghostEl = ghost;
    }
    if (gesture.mode === "drag" && gesture.ghostEl) {
      gesture.ghostEl.style.left = `${e.clientX}px`;
      gesture.ghostEl.style.top = `${e.clientY}px`;
      updateDropTarget(e.clientX, e.clientY);
    }
  };

  const onUp = (e) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    window.removeEventListener("pointermove", onMove, true);
    window.removeEventListener("pointerup", onUp, true);
    window.removeEventListener("pointercancel", onUp, true);

    const g = gesture;
    const seatEl = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".seat");

    if (g.mode === "drag") {
      suppressClickUntil = Date.now() + 400;
      cancelGesture("drop-cleanup");
      if (seatEl) {
        commitAction(g.charId, seatEl.dataset.seat);
      } else {
        log("invalid-drop");
        render();
      }
      return;
    }

    // tap path: select or place
    cancelGesture("tap-end");
    if (selectedChar === g.charId) {
      selectedChar = null;
      render();
      return;
    }
    if (selectedChar && seatEl) {
      // shouldn't happen on char tap
    }
    selectedChar = g.charId;
    render();
  };

  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onUp, true);
}

function updateDropTarget(x, y) {
  document.querySelectorAll(".seat.drop-target").forEach((s) => s.classList.remove("drop-target"));
  const seatEl = document.elementFromPoint(x, y)?.closest?.(".seat");
  if (seatEl) seatEl.classList.add("drop-target");
}

function onSeatClick(ev) {
  if (Date.now() < suppressClickUntil) return;
  const seat = ev.currentTarget.dataset.seat;
  if (!selectedChar) return;
  // click-character-then-click-seat
  commitAction(selectedChar, seat);
}

function render() {
  if (!level || !app) return;
  const { result, won } = evalState();
  const rel = relatedHighlight();
  const seats = availableSeats();
  const layoutClass = seats.length === 4 ? "layout-4" : "layout-6";

  app.innerHTML = "";

  // header
  const header = document.createElement("header");
  header.className = "bar";
  const h1 = document.createElement("h1");
  h1.textContent = `宴席灰盒 · ${level.id} ${level.title}`;
  header.appendChild(h1);

  const sw = document.createElement("div");
  sw.className = "level-switch";
  for (const id of LEVEL_IDS) {
    const b = document.createElement("button");
    b.className = "btn" + (level.id === id ? " active" : "");
    b.type = "button";
    b.textContent = id;
    b.addEventListener("click", () => switchLevel(id));
    sw.appendChild(b);
  }
  header.appendChild(sw);

  const undoBtn = document.createElement("button");
  undoBtn.className = "btn";
  undoBtn.type = "button";
  undoBtn.textContent = "撤销";
  undoBtn.disabled = history.length === 0;
  undoBtn.addEventListener("click", () => undo());
  header.appendChild(undoBtn);

  const resetBtn = document.createElement("button");
  resetBtn.className = "btn";
  resetBtn.type = "button";
  resetBtn.textContent = "重置";
  resetBtn.addEventListener("click", () => resetLevel(true));
  header.appendChild(resetBtn);

  app.appendChild(header);

  const status = document.createElement("div");
  status.className = "status-line" + (won ? " win" : !result.ok ? " err" : "");
  status.id = "status-line";
  if (!result.ok) {
    status.textContent = `局面非法：${result.errors.join("；")}`;
  } else if (won) {
    status.textContent = "通关！全部入座且规则均满足";
  } else {
    const seated = level.characters.filter((c) => assignment[c]).length;
    status.textContent = `已入座 ${seated}/${level.characters.length} · 历史 ${history.length} · 点选或拖拽入座`;
  }
  app.appendChild(status);

  // table
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const grid = document.createElement("div");
  grid.className = `table-grid ${layoutClass}`;
  for (const seat of seats) {
    const seatEl = document.createElement("div");
    seatEl.className = "seat";
    seatEl.dataset.seat = seat;
    seatEl.style.setProperty("--seat-area", seatStyleArea(seat));
    if (rel.seats.includes(seat)) seatEl.classList.add("hl");
    if (selectedChar) seatEl.classList.add("hl");
    const sid = document.createElement("span");
    sid.className = "seat-id";
    sid.textContent = seat;
    seatEl.appendChild(sid);
    const who = occupantOf(assignment, seat);
    if (who) seatEl.appendChild(makeCharEl(who));
    seatEl.addEventListener("click", onSeatClick);
    grid.appendChild(seatEl);
  }
  tableWrap.appendChild(grid);
  app.appendChild(tableWrap);

  // waiting
  const waiting = document.createElement("div");
  waiting.className = "waiting";
  const wh = document.createElement("h2");
  wh.textContent = "候客区（初始全员在此）";
  waiting.appendChild(wh);
  const row = document.createElement("div");
  row.className = "waiting-row";
  row.dataset.zone = "waiting";
  for (const c of level.characters) {
    if (!assignment[c]) row.appendChild(makeCharEl(c));
  }
  waiting.appendChild(row);
  app.appendChild(waiting);

  // rules
  const rulesBox = document.createElement("div");
  rulesBox.className = "rules";
  const rh = document.createElement("h2");
  rh.textContent = "规则状态（符号+文本，非仅靠颜色）";
  rulesBox.appendChild(rh);

  if (!result.ok) {
    const p = document.createElement("div");
    p.className = "hint";
    p.textContent = "评估未通过（ok=false），不显示全绿满足态。";
    rulesBox.appendChild(p);
  } else {
    for (const rr of result.rules) {
      const rule = level.rules.find((r) => r.id === rr.id);
      const meta = STATUS_META[rr.status] || STATUS_META[PENDING];
      const el = document.createElement("div");
      el.className = `rule ${meta.className}` + (highlightRuleId === rr.id ? " active" : "");
      el.dataset.rule = rr.id;
      el.innerHTML = `<div class="sym" aria-label="${meta.text}">${meta.symbol}</div>
        <div><div>${describeRule(rule || { id: rr.id, kind: "?", subject: "?" })}</div>
        <div class="meta">${rr.id} · ${meta.symbol} ${meta.text}（${rr.status}）</div></div>`;
      el.addEventListener("click", () => {
        highlightRuleId = highlightRuleId === rr.id ? null : rr.id;
        render();
      });
      rulesBox.appendChild(el);
    }
  }
  app.appendChild(rulesBox);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent =
    "操作：拖拽角色到座位；或先点角色再点座位。空座移动；两入座交换；候客挤占则原住回候客。无效落点/原座不入撤销。";
  app.appendChild(hint);

  // expose for evidence scripts
  window.__BANQUET__ = {
    levelId: level.id,
    assignment: cloneAssignment(assignment),
    historyLen: history.length,
    selectedChar,
    won,
    evalOk: result.ok,
    rules: result.ok ? result.rules : [],
    viewport: {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      dpr: window.devicePixelRatio,
    },
  };
}

function onVisibility() {
  if (document.hidden) cancelGesture("visibility");
}
function onBlur() {
  cancelGesture("blur");
}

async function boot() {
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);
  // interrupt incomplete gesture on page hide
  window.addEventListener("pagehide", () => cancelGesture("pagehide"));

  const params = new URLSearchParams(location.search);
  const start = (params.get("level") || "L01").toUpperCase();
  await switchLevel(LEVEL_IDS.includes(start) ? start : "L01");
}

boot().catch((e) => {
  console.error(e);
  if (app) app.textContent = `启动失败：${e.message}`;
});
