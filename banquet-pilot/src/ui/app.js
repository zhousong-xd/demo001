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

/**
 * Active gesture (single primary pointer only).
 * @type {{
 *   pointerId: number,
 *   charId: string,
 *   mode: 'drag'|'tap',
 *   startX: number,
 *   startY: number,
 *   moved: boolean,
 *   ghostEl: HTMLElement|null,
 *   targetEl: Element|null,
 *   onMove: (e: PointerEvent) => void,
 *   onUp: (e: PointerEvent) => void,
 *   onCancel: (e: PointerEvent) => void,
 *   onLostCapture: (e: PointerEvent) => void,
 * } | null}
 */
let gesture = null;
let suppressClickUntil = 0;
/** Prevent re-entrant teardown / double commit. */
let tearingDown = false;

const DRAG_THRESHOLD = 8;

/** Reviewable listener instrumentation (register/unregister counts). */
const listenerStats = {
  register: 0,
  unregister: 0,
  /** Currently attached window gesture listeners (move+up+cancel). */
  activeWindow: 0,
  commits: 0,
  cancels: 0,
};

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
  endGesture("reset", { commit: false });
  render();
}

async function switchLevel(id) {
  endGesture("level-switch", { commit: false });
  level = await loadLevelJson(id);
  history = createHistory();
  selectedChar = null;
  highlightRuleId = null;
  assignment = createInitialAssignment(level);
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
  listenerStats.commits += 1;
  log("action", result.kind, charId, "->", seat);
  render();
  return true;
}

function undo() {
  if (gesture) {
    endGesture("undo", { commit: false });
  }
  const prev = popHistory(history);
  if (!prev) return;
  assignment = prev;
  selectedChar = null;
  assertBoardIntegrity(assignment, level.characters, availableSeats());
  render();
}

/**
 * Idempotent gesture teardown: always remove onMove/onUp/onCancel,
 * clear ghost/capture/gesture. Never commits.
 * Safe to call when gesture is already null.
 *
 * @param {string} reason
 * @param {{ commit?: boolean, seat?: string|null, charId?: string|null }} [opts]
 *   If commit=true, perform seat action AFTER teardown (pointerup path only).
 */
function endGesture(reason, opts = {}) {
  const { commit = false, seat = null, charId = null } = opts;
  if (tearingDown) return;
  if (!gesture && !commit) return;

  tearingDown = true;
  const g = gesture;
  gesture = null;

  try {
    if (g) {
      // Detach window listeners (idempotent removeEventListener)
      if (g.onMove) {
        window.removeEventListener("pointermove", g.onMove, true);
        listenerStats.unregister += 1;
        listenerStats.activeWindow = Math.max(0, listenerStats.activeWindow - 1);
      }
      if (g.onUp) {
        window.removeEventListener("pointerup", g.onUp, true);
        listenerStats.unregister += 1;
        listenerStats.activeWindow = Math.max(0, listenerStats.activeWindow - 1);
      }
      if (g.onCancel) {
        window.removeEventListener("pointercancel", g.onCancel, true);
        listenerStats.unregister += 1;
        listenerStats.activeWindow = Math.max(0, listenerStats.activeWindow - 1);
      }
      if (g.targetEl && g.onLostCapture) {
        g.targetEl.removeEventListener("lostpointercapture", g.onLostCapture);
      }
      // Release capture if still held (may fire lostpointercapture — gesture already null)
      if (g.targetEl && g.pointerId != null) {
        try {
          if (g.targetEl.hasPointerCapture?.(g.pointerId)) {
            g.targetEl.releasePointerCapture(g.pointerId);
          }
        } catch {
          /* ignore */
        }
      }
      if (g.ghostEl && g.ghostEl.parentNode) {
        g.ghostEl.parentNode.removeChild(g.ghostEl);
      }
      const el = document.querySelector(`.char[data-char="${g.charId}"]`);
      if (el) el.classList.remove("dragging");
      document.querySelectorAll(".seat.drop-target").forEach((s) => s.classList.remove("drop-target"));
      if (!commit) {
        listenerStats.cancels += 1;
        log("gesture-cancel", reason, g.charId);
      } else {
        log("gesture-end", reason, g.charId);
      }
    }

    if (commit && charId && seat) {
      commitAction(charId, seat);
    }
  } finally {
    tearingDown = false;
  }
}

/** Alias used by older call sites / clarity for cancel-only paths. */
function cancelGesture(reason) {
  endGesture(reason, { commit: false });
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

  // multi-touch: ignore second finger / different pointer while gesture active
  if (gesture && gesture.pointerId !== ev.pointerId) {
    ev.preventDefault();
    return;
  }
  // If a gesture somehow still exists for same pointer, tear it down first
  if (gesture) {
    endGesture("re-down", { commit: false });
  }

  ev.preventDefault();
  const targetEl = ev.currentTarget;
  try {
    targetEl.setPointerCapture?.(ev.pointerId);
  } catch {
    /* ignore */
  }

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

  /** pointerup ONLY — may commit. Never used for pointercancel. */
  const onUp = (e) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    if (e.type !== "pointerup") {
      // Defensive: never treat non-up as drop
      endGesture("non-up-" + e.type, { commit: false });
      return;
    }

    const g = gesture;
    const seatEl = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".seat");
    const seat = seatEl?.dataset?.seat || null;

    if (g.mode === "drag") {
      suppressClickUntil = Date.now() + 400;
      // Teardown first (never leave listeners), then commit if valid seat
      endGesture("pointerup-drag", {
        commit: !!seat,
        seat,
        charId: g.charId,
      });
      if (!seat) {
        log("invalid-drop");
        render();
      }
      return;
    }

    // tap path: select, deselect, or complete prior selection onto this char's seat
    const tappedChar = g.charId;
    const priorSelected = selectedChar;
    endGesture("pointerup-tap", { commit: false });

    // Center-of-occupied-seat: if another char was already selected, tapping
    // this seated char completes swap/displace (same as clicking empty seat area).
    if (priorSelected && priorSelected !== tappedChar) {
      const targetSeat = assignment[tappedChar];
      if (targetSeat) {
        commitAction(priorSelected, targetSeat);
        return;
      }
      // Target is waiting (no seat): switch selection to tapped char
      selectedChar = tappedChar;
      render();
      return;
    }

    if (priorSelected === tappedChar) {
      selectedChar = null;
      render();
      return;
    }

    selectedChar = tappedChar;
    render();
  };

  /** Independent cancel path — NEVER commits / drops. */
  const onCancel = (e) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    endGesture("pointercancel", { commit: false });
    render(); // restore UI; fox stays waiting / history unchanged
  };

  const onLostCapture = (e) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    // Capture lost unexpectedly — cancel without commit (idempotent if already torn down)
    endGesture("lostpointercapture", { commit: false });
    render();
  };

  gesture = {
    pointerId: ev.pointerId,
    charId,
    mode: "tap",
    startX: ev.clientX,
    startY: ev.clientY,
    moved: false,
    ghostEl: null,
    targetEl,
    onMove,
    onUp,
    onCancel,
    onLostCapture,
  };

  window.addEventListener("pointermove", onMove, true);
  window.addEventListener("pointerup", onUp, true);
  window.addEventListener("pointercancel", onCancel, true);
  targetEl.addEventListener("lostpointercapture", onLostCapture);
  listenerStats.register += 3;
  listenerStats.activeWindow += 3;
}

function updateDropTarget(x, y) {
  document.querySelectorAll(".seat.drop-target").forEach((s) => s.classList.remove("drop-target"));
  const seatEl = document.elementFromPoint(x, y)?.closest?.(".seat");
  if (seatEl) seatEl.classList.add("drop-target");
}

function onSeatClick(ev) {
  if (Date.now() < suppressClickUntil) return;
  // Gate while a gesture is active (second finger must not commit/rewrite)
  if (gesture) return;
  const seat = ev.currentTarget.dataset.seat;
  if (!selectedChar) return;
  // click-character-then-click-seat (empty area of seat, or after center handled via char tap)
  commitAction(selectedChar, seat);
}

/** Gate control clicks while a primary gesture is incomplete. */
function gatedControl(fn) {
  return (ev) => {
    if (gesture) {
      ev.preventDefault();
      ev.stopPropagation();
      return;
    }
    fn(ev);
  };
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
    b.addEventListener("click", gatedControl(() => switchLevel(id)));
    sw.appendChild(b);
  }
  header.appendChild(sw);

  const undoBtn = document.createElement("button");
  undoBtn.className = "btn";
  undoBtn.type = "button";
  undoBtn.textContent = "撤销";
  undoBtn.disabled = history.length === 0;
  undoBtn.addEventListener("click", gatedControl(() => undo()));
  header.appendChild(undoBtn);

  const resetBtn = document.createElement("button");
  resetBtn.className = "btn";
  resetBtn.type = "button";
  resetBtn.textContent = "重置";
  resetBtn.addEventListener("click", gatedControl(() => resetLevel(true)));
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
      el.addEventListener("click", gatedControl(() => {
        highlightRuleId = highlightRuleId === rr.id ? null : rr.id;
        render();
      }));
      rulesBox.appendChild(el);
    }
  }
  app.appendChild(rulesBox);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent =
    "操作：拖拽角色到座位；或先点角色再点座位。空座移动；两入座交换；候客挤占则原住回候客。无效落点/原座不入撤销。";
  app.appendChild(hint);

  // Read-only snapshot for evidence scripts — never write game state via this object.
  // Live getters for gesture/listener fields (updated continuously; not only on render).
  const snapshot = {
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
  Object.defineProperties(snapshot, {
    gestureActive: {
      enumerable: true,
      get() {
        return !!gesture;
      },
    },
    ghostPresent: {
      enumerable: true,
      get() {
        return !!document.querySelector(".ghost");
      },
    },
    listenerStats: {
      enumerable: true,
      get() {
        return {
          register: listenerStats.register,
          unregister: listenerStats.unregister,
          activeWindow: listenerStats.activeWindow,
          commits: listenerStats.commits,
          cancels: listenerStats.cancels,
        };
      },
    },
  });
  window.__BANQUET__ = snapshot;
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
