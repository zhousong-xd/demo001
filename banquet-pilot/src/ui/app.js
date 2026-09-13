/** Banquet Pilot interactive graybox (T-003/T-004).
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
  applyCalmProp,
  applySeatAction,
  assertBoardIntegrity,
  cloneAssignment,
  cloneCalm,
  cloneInventory,
  createHistory,
  createInitialAssignment,
  createInitialInventory,
  occupantOf,
  popPlayHistory,
  pushPlayHistory,
  snapshotPlay,
} from "./board.js";
import {
  CHAR_COLOR,
  CHAR_LABEL,
  STATUS_META,
  describeRule,
  ruleRelated,
} from "./labels.js";
import { hintText, maxHintTier } from "./hints.js";
import {
  SAVE_VERSION,
  clearSave,
  probeStorage,
  readSaveRaw,
  validateSavePayload,
  writeSave,
} from "./save.js";

const LEVEL_IDS = ["L01", "L02", "L03"];

/** Optional embed injected by standalone build. */
const EMBEDDED =
  typeof globalThis !== "undefined" && globalThis.__BANQUET_EMBEDDED_LEVELS__
    ? globalThis.__BANQUET_EMBEDDED_LEVELS__
    : null;

/** @type {object|null} */
let level = null;
/** @type {Record<string, string|null>} */
let assignment = {};
/** @type {Set<string>} */
let calm = new Set();
/** @type {Record<string, number>} */
let inventory = {};
/** @type {any[]} */
let history = createHistory();
/** @type {string|null} */
let selectedChar = null;
/** @type {string|null} */
let highlightRuleId = null;
/** Prop targeting mode: prop id or null */
let propMode = null;
/** Revealed hint tier 0..3 */
let hintTier = 0;
/** Levels already cleared this session (and persisted) */
let clearedLevels = [];
/** Prevent double win-advance for the same continuous win */
let winLatch = false;
/** User-visible storage / save message */
let storageMessage = "";
/** Show win feast panel */
let showFeast = false;

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
  console.log("[banquet]", ...args);
}

function playState() {
  return { assignment, calm, inventory };
}

async function loadLevelJson(id) {
  const key = String(id).toUpperCase();
  if (EMBEDDED && EMBEDDED[key]) {
    return structuredClone
      ? structuredClone(EMBEDDED[key])
      : JSON.parse(JSON.stringify(EMBEDDED[key]));
  }
  const name = String(id).toLowerCase();
  const res = await fetch(`./levels/${name}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`load level ${id}: HTTP ${res.status}`);
  return res.json();
}

function resetLevel(keepHistoryClear = true) {
  assignment = createInitialAssignment(level);
  calm = new Set();
  inventory = createInitialInventory(level);
  if (keepHistoryClear) history = createHistory();
  selectedChar = null;
  propMode = null;
  hintTier = 0;
  winLatch = false;
  showFeast = false;
  endGesture("reset", { commit: false });
  persist();
  render();
}

async function switchLevel(id, opts = {}) {
  const { restore = null } = opts;
  endGesture("level-switch", { commit: false });
  level = await loadLevelJson(id);
  if (restore) {
    assignment = cloneAssignment(restore.assignment);
    calm = cloneCalm(restore.calm || []);
    inventory = cloneInventory(restore.inventory || createInitialInventory(level));
    history = Array.isArray(restore.history) ? restore.history.slice() : createHistory();
    hintTier = typeof restore.hintTier === "number" ? restore.hintTier : 0;
  } else {
    history = createHistory();
    assignment = createInitialAssignment(level);
    calm = new Set();
    inventory = createInitialInventory(level);
    hintTier = 0;
  }
  selectedChar = null;
  highlightRuleId = null;
  propMode = null;
  winLatch = false;
  showFeast = false;
  // If restored mid-win, re-evaluate feast latch without auto-advancing
  const won = isWin(level, assignment, { calm });
  if (won) {
    winLatch = true;
    showFeast = true;
  }
  render();
  persist();
  log("level", level.id, level.title);
}

function availableSeats() {
  return level.seats.slice();
}

function commitAction(charId, seat) {
  const before = snapshotPlay(playState());
  const result = applySeatAction(assignment, charId, seat, availableSeats());
  if (!result) {
    log("noop", charId, seat);
    return false;
  }
  pushPlayHistory(history, before);
  assignment = result.next;
  assertBoardIntegrity(assignment, level.characters, availableSeats());
  selectedChar = null;
  propMode = null;
  listenerStats.commits += 1;
  log("action", result.kind, charId, "->", seat);
  afterBoardChange();
  return true;
}

function afterBoardChange() {
  const { won } = evalState();
  if (won && !winLatch) {
    winLatch = true;
    showFeast = true;
    if (!clearedLevels.includes(level.id)) {
      clearedLevels = [...clearedLevels, level.id];
    }
    log("feast", level.id);
  }
  if (!won) {
    // Allow a new feast if player undoes out of win then re-wins
    winLatch = false;
    showFeast = false;
  }
  persist();
  render();
}

function undo() {
  if (gesture) {
    endGesture("undo", { commit: false });
  }
  const prev = popPlayHistory(history);
  if (!prev) return;
  assignment = prev.assignment;
  calm = prev.calm;
  inventory = prev.inventory;
  selectedChar = null;
  propMode = null;
  showFeast = false;
  winLatch = false;
  assertBoardIntegrity(assignment, level.characters, availableSeats());
  afterBoardChange();
}

function tryApplyCalm(targetChar) {
  const before = snapshotPlay(playState());
  const r = applyCalmProp(playState(), "calm_bell", targetChar, level);
  if (!r.ok) {
    log("calm-reject", r.reason, targetChar);
    storageMessage = r.reason === "invalid-target"
      ? "安心铃只能对兔使用（无效目标，未消耗）"
      : r.reason === "no-stock"
        ? "安心铃库存不足"
        : `无法使用安心铃：${r.reason}`;
    propMode = null;
    render();
    return false;
  }
  if (r.reason === "already-calm") {
    log("calm-already", targetChar);
    storageMessage = "该角色已安心（未额外消耗）";
    propMode = null;
    render();
    return true;
  }
  if (r.next) {
    pushPlayHistory(history, before);
    assignment = r.next.assignment;
    calm = r.next.calm;
    inventory = r.next.inventory;
    selectedChar = null;
    propMode = null;
    storageMessage = `已对 ${CHAR_LABEL[targetChar] || targetChar} 使用安心铃`;
    log("calm-applied", targetChar, "stock", inventory.calm_bell);
    afterBoardChange();
    return true;
  }
  return false;
}

/**
 * Idempotent gesture teardown: always remove onMove/onUp/onCancel,
 * clear ghost/capture/gesture. Never commits.
 * Safe to call when gesture is already null.
 *
 * @param {string} reason
 * @param {{ commit?: boolean, seat?: string|null, charId?: string|null }} [opts]
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

function cancelGesture(reason) {
  endGesture(reason, { commit: false });
}

function evalState() {
  const result = evaluateLevel(level, assignment, { calm });
  const won = isWin(level, assignment, { calm });
  if (!result.ok && won) {
    return { result, won: false };
  }
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
  return seat;
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
  if (calm.has(charId)) el.classList.add("calm");
  const rel = relatedHighlight();
  if (rel.chars.includes(charId)) el.classList.add("hl");
  if (calm.has(charId)) {
    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = "安";
    el.appendChild(badge);
  }

  el.addEventListener("pointerdown", onCharPointerDown);
  return el;
}

function onCharPointerDown(ev) {
  if (ev.button !== undefined && ev.button !== 0) return;
  const charId = ev.currentTarget.dataset.char;

  // Prop targeting: tap character to apply calm_bell
  if (propMode === "calm_bell") {
    ev.preventDefault();
    tryApplyCalm(charId);
    return;
  }

  if (gesture && gesture.pointerId !== ev.pointerId) {
    ev.preventDefault();
    return;
  }
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

  const onUp = (e) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    if (e.type !== "pointerup") {
      endGesture("non-up-" + e.type, { commit: false });
      return;
    }

    const g = gesture;
    const seatEl = document.elementFromPoint(e.clientX, e.clientY)?.closest?.(".seat");
    const seat = seatEl?.dataset?.seat || null;

    if (g.mode === "drag") {
      suppressClickUntil = Date.now() + 400;
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

    const tappedChar = g.charId;
    const priorSelected = selectedChar;
    endGesture("pointerup-tap", { commit: false });

    if (priorSelected && priorSelected !== tappedChar) {
      const targetSeat = assignment[tappedChar];
      if (targetSeat) {
        commitAction(priorSelected, targetSeat);
        return;
      }
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

  const onCancel = (e) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
    endGesture("pointercancel", { commit: false });
    render();
  };

  const onLostCapture = (e) => {
    if (!gesture || e.pointerId !== gesture.pointerId) return;
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
  if (gesture) return;
  if (propMode) return;
  const seat = ev.currentTarget.dataset.seat;
  if (!selectedChar) return;
  commitAction(selectedChar, seat);
}

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

function persist() {
  if (!level) return;
  const payload = {
    version: SAVE_VERSION,
    levelId: level.id,
    assignment: cloneAssignment(assignment),
    calm: [...calm],
    inventory: cloneInventory(inventory),
    history: history.map((h) =>
      h && h.assignment !== undefined
        ? {
            assignment: cloneAssignment(h.assignment),
            calm: Array.isArray(h.calm) ? h.calm.slice() : [...(h.calm || [])],
            inventory: cloneInventory(h.inventory || {}),
          }
        : cloneAssignment(h),
    ),
    hintTier,
    clearedLevels: clearedLevels.slice(),
    savedAt: new Date().toISOString(),
  };
  const w = writeSave(payload);
  if (!w.ok && w.unavailable) {
    storageMessage = w.message;
  }
}

async function tryRestoreOnBoot() {
  const raw = readSaveRaw();
  if (!raw.ok) {
    if (raw.unavailable) {
      storageMessage = raw.message + " — 仍可游玩，但进度不会保存。";
    } else if (raw.corrupt) {
      storageMessage = raw.message + " — 已恢复到开局。";
      clearSave();
    }
    return null;
  }
  const data = raw.data;
  if (!data || typeof data !== "object" || data.version !== SAVE_VERSION) {
    storageMessage = "存档版本不兼容 — 已恢复到开局。";
    clearSave();
    return null;
  }
  const id = String(data.levelId || "L01").toUpperCase();
  if (!LEVEL_IDS.includes(id)) {
    storageMessage = "存档关卡无效 — 已恢复到开局。";
    clearSave();
    return null;
  }
  let lvl;
  try {
    lvl = await loadLevelJson(id);
  } catch {
    storageMessage = "存档关卡加载失败 — 已恢复到开局。";
    clearSave();
    return null;
  }
  const valid = validateSavePayload(data, lvl);
  if (!valid) {
    storageMessage = "存档状态校验失败 — 已恢复到开局。";
    clearSave();
    return null;
  }
  clearedLevels = Array.isArray(valid.clearedLevels) ? valid.clearedLevels.slice() : [];
  return { levelId: id, restore: valid };
}

function revealNextHint() {
  const max = maxHintTier(level.id);
  if (hintTier >= max) return;
  hintTier += 1;
  persist();
  render();
}

function goNextLevel() {
  const idx = LEVEL_IDS.indexOf(level.id);
  const next = LEVEL_IDS[Math.min(idx + 1, LEVEL_IDS.length - 1)];
  showFeast = false;
  if (next === level.id) {
    // Last level: replay
    resetLevel(true);
    return;
  }
  switchLevel(next);
}

function render() {
  if (!level || !app) return;
  const { result, won } = evalState();
  const rel = relatedHighlight();
  const seats = availableSeats();
  const layoutClass = seats.length === 4 ? "layout-4" : "layout-6";
  const bellStock = inventory.calm_bell ?? 0;
  const hasBell = (level.props || []).some((p) => p.id === "calm_bell");

  app.innerHTML = "";

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
    b.textContent = id + (clearedLevels.includes(id) ? "✓" : "");
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
  resetBtn.textContent = "重玩";
  resetBtn.title = "恢复本关初始局面与道具库存";
  resetBtn.addEventListener("click", gatedControl(() => resetLevel(true)));
  header.appendChild(resetBtn);

  app.appendChild(header);

  if (storageMessage) {
    const msg = document.createElement("div");
    msg.className = "storage-msg";
    msg.textContent = storageMessage;
    msg.addEventListener("click", () => {
      storageMessage = "";
      render();
    });
    app.appendChild(msg);
  }

  const status = document.createElement("div");
  status.className = "status-line" + (won ? " win" : !result.ok ? " err" : "");
  status.id = "status-line";
  if (!result.ok) {
    status.textContent = `局面非法：${result.errors.join("；")}`;
  } else if (won) {
    status.textContent = "开席！全部入座且规则均满足";
  } else {
    const seated = level.characters.filter((c) => assignment[c]).length;
    const invBits = hasBell ? ` · 安心铃×${bellStock}` : "";
    status.textContent = `已入座 ${seated}/${level.characters.length} · 历史 ${history.length}${invBits} · 点选或拖拽入座`;
  }
  app.appendChild(status);

  // Props + hints toolbar
  const tools = document.createElement("div");
  tools.className = "tools";

  if (hasBell) {
    const bellBtn = document.createElement("button");
    bellBtn.className = "btn" + (propMode === "calm_bell" ? " active primary" : "");
    bellBtn.type = "button";
    bellBtn.textContent = propMode === "calm_bell"
      ? `点选目标（铃×${bellStock}）`
      : `安心铃 ×${bellStock}`;
    bellBtn.disabled = bellStock < 1 && propMode !== "calm_bell";
    bellBtn.addEventListener(
      "click",
      gatedControl(() => {
        if (propMode === "calm_bell") {
          propMode = null;
        } else {
          propMode = "calm_bell";
          selectedChar = null;
          storageMessage = "请点选兔以使用安心铃（无效目标不消耗）";
        }
        render();
      }),
    );
    tools.appendChild(bellBtn);
  }

  const hintBtn = document.createElement("button");
  hintBtn.className = "btn";
  hintBtn.type = "button";
  const maxH = maxHintTier(level.id);
  hintBtn.textContent =
    hintTier >= maxH ? `提示 ${hintTier}/${maxH}` : `免费提示 ${hintTier}/${maxH}`;
  hintBtn.disabled = hintTier >= maxH;
  hintBtn.addEventListener("click", gatedControl(() => revealNextHint()));
  tools.appendChild(hintBtn);

  app.appendChild(tools);

  if (hintTier > 0) {
    const hintsBox = document.createElement("div");
    hintsBox.className = "hints-box";
    for (let t = 1; t <= hintTier; t++) {
      const line = document.createElement("div");
      line.className = "hint-line";
      line.textContent = `提示${t}：${hintText(level.id, t)}`;
      hintsBox.appendChild(line);
    }
    app.appendChild(hintsBox);
  }

  if (showFeast && won) {
    const feast = document.createElement("div");
    feast.className = "feast";
    const ft = document.createElement("div");
    ft.className = "feast-title";
    ft.textContent = level.id === "L03" ? "三关开席成功！" : `${level.id} 开席成功`;
    feast.appendChild(ft);
    const actions = document.createElement("div");
    actions.className = "feast-actions";
    const replay = document.createElement("button");
    replay.className = "btn";
    replay.type = "button";
    replay.textContent = "重玩本关";
    replay.addEventListener(
      "click",
      gatedControl(() => {
        showFeast = false;
        resetLevel(true);
      }),
    );
    actions.appendChild(replay);
    const idx = LEVEL_IDS.indexOf(level.id);
    if (idx < LEVEL_IDS.length - 1) {
      const next = document.createElement("button");
      next.className = "btn primary";
      next.type = "button";
      next.textContent = `下一关 ${LEVEL_IDS[idx + 1]}`;
      next.addEventListener("click", gatedControl(() => goNextLevel()));
      actions.appendChild(next);
    } else {
      const back = document.createElement("button");
      back.className = "btn primary";
      back.type = "button";
      back.textContent = "返回 L01";
      back.addEventListener(
        "click",
        gatedControl(() => {
          showFeast = false;
          switchLevel("L01");
        }),
      );
      actions.appendChild(back);
    }
    feast.appendChild(actions);
    app.appendChild(feast);
  }

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
      el.addEventListener(
        "click",
        gatedControl(() => {
          highlightRuleId = highlightRuleId === rr.id ? null : rr.id;
          render();
        }),
      );
      rulesBox.appendChild(el);
    }
  }
  app.appendChild(rulesBox);

  const hint = document.createElement("div");
  hint.className = "hint";
  hint.textContent =
    "操作：拖拽角色到座位；或先点角色再点座位。空座移动；两入座交换；候客挤占则原住回候客。安心铃：点按钮再点兔。撤销恢复座位/安心/库存。重玩恢复初始道具。提示免费无惩罚。";
  app.appendChild(hint);

  const snapshot = {
    levelId: level.id,
    assignment: cloneAssignment(assignment),
    calm: [...calm],
    inventory: cloneInventory(inventory),
    historyLen: history.length,
    selectedChar,
    propMode,
    hintTier,
    clearedLevels: clearedLevels.slice(),
    won,
    showFeast,
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
  window.addEventListener("pagehide", () => cancelGesture("pagehide"));

  const probe = probeStorage();
  if (!probe.available) {
    storageMessage = `本地存储不可用（${probe.reason || "未知"}）— 仍可游玩，但进度不会保存。`;
  }

  const params = new URLSearchParams(location.search);
  const startParam = (params.get("level") || "").toUpperCase();
  const restored = await tryRestoreOnBoot();
  const bootMsg = storageMessage;

  if (startParam && LEVEL_IDS.includes(startParam)) {
    // Explicit URL level wins (fresh play of that level) — keep recovery notices
    await switchLevel(startParam);
  } else if (restored) {
    await switchLevel(restored.levelId, { restore: restored.restore });
    if (!storageMessage) storageMessage = "已从本地存档恢复";
  } else {
    await switchLevel("L01");
  }
  if (bootMsg && !storageMessage) storageMessage = bootMsg;
  if (storageMessage) render();
}

boot().catch((e) => {
  console.error(e);
  if (app) app.textContent = `启动失败：${e.message}`;
});
