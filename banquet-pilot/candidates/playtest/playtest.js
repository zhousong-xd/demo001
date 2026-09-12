/** Candidates-only playtest loader (T-016).
 * Reuses src/core + src/ui/board + labels via relative ESM.
 * Does NOT import product app.js (L01–L03 boot / formal save).
 * Does NOT write banquet-pilot-save-v1.
 * These JSON drafts are not shipped levels.
 */
import { evaluateLevel, isWin } from "../../src/core/index.js";
import {
  applyCalmProp,
  applySeatAction,
  assertBoardIntegrity,
  cloneAssignment,
  cloneInventory,
  createHistory,
  createInitialAssignment,
  createInitialInventory,
  occupantOf,
  popPlayHistory,
  pushPlayHistory,
  snapshotPlay,
} from "../../src/ui/board.js";
import {
  CHAR_COLOR,
  CHAR_LABEL,
  STATUS_META,
  describeRule,
  ruleRelated,
} from "../../src/ui/labels.js";

const CANDIDATE_FILES = [
  "c01", "c02", "c03", "c04", "c05", "c06",
  "c07", "c08", "c09", "c10", "c11", "c12",
];

const app = document.getElementById("app");

/** @type {object|null} */
let level = null;
/** @type {string} */
let fileId = "c01";
/** @type {Record<string, string|null>} */
let assignment = {};
/** @type {Set<string>} */
let calm = new Set();
/** @type {Record<string, number>} */
let inventory = {};
/** @type {any[]} */
let playHistory = createHistory();
/** @type {string|null} */
let selectedChar = null;
/** @type {string|null} */
let highlightRuleId = null;
/** @type {string|null} */
let propMode = null;
let message = "";

function playState() {
  return { assignment, calm, inventory };
}

async function loadCandidateJson(id) {
  const name = String(id).toLowerCase();
  if (!CANDIDATE_FILES.includes(name)) {
    throw new Error(`unknown candidate ${id} (c01–c12 only)`);
  }
  const res = await fetch(`../levels/${name}.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`load candidate ${name}: HTTP ${res.status}`);
  return res.json();
}

function resetCandidate() {
  assignment = createInitialAssignment(level);
  calm = new Set();
  inventory = createInitialInventory(level);
  playHistory = createHistory();
  selectedChar = null;
  propMode = null;
  highlightRuleId = null;
  message = "";
  render();
}

/** Bumps on each switch so a slow fetch cannot clobber a newer candidate. */
let loadGen = 0;

async function switchCandidate(id) {
  const name = String(id).toLowerCase();
  const gen = ++loadGen;
  let next;
  try {
    next = await loadCandidateJson(name);
  } catch (e) {
    if (gen !== loadGen) return;
    if (app) {
      app.textContent = `切换失败（${name}）：${e.message}。请确认从 banquet-pilot/ 根目录开 http.server，再刷新重试。`;
    }
    throw e;
  }
  if (gen !== loadGen) return; // superseded by a newer switch
  level = next;
  fileId = name;
  try {
    const url = new URL(location.href);
    url.searchParams.set("c", name);
    if (typeof window.history.replaceState === "function") {
      window.history.replaceState(null, "", url);
    }
  } catch {
    /* headless / restricted History API */
  }
  resetCandidate();
}

function availableSeats() {
  return level.seats.slice();
}

function commitAction(charId, seat) {
  const before = snapshotPlay(playState());
  const result = applySeatAction(assignment, charId, seat, availableSeats());
  if (!result) return false;
  pushPlayHistory(playHistory, before);
  assignment = result.next;
  assertBoardIntegrity(assignment, level.characters, availableSeats());
  selectedChar = null;
  propMode = null;
  message = "";
  render();
  return true;
}

function undo() {
  const prev = popPlayHistory(playHistory);
  if (!prev) return;
  assignment = prev.assignment;
  calm = prev.calm;
  inventory = prev.inventory;
  selectedChar = null;
  propMode = null;
  render();
}

function tryApplyCalm(targetChar) {
  const before = snapshotPlay(playState());
  const r = applyCalmProp(playState(), "calm_bell", targetChar, level);
  if (!r.ok) {
    message = r.reason === "invalid-target"
      ? "安心铃：无效目标，未消耗（候选规则，非正式关）"
      : `无法使用安心铃：${r.reason}`;
    propMode = null;
    render();
    return false;
  }
  if (r.reason === "already-calm") {
    message = "该角色已安心（未额外消耗）";
    propMode = null;
    render();
    return true;
  }
  if (r.next) {
    pushPlayHistory(playHistory, before);
    assignment = r.next.assignment;
    calm = r.next.calm;
    inventory = r.next.inventory;
    selectedChar = null;
    propMode = null;
    message = `已对 ${CHAR_LABEL[targetChar] || targetChar} 使用安心铃（候选）`;
    render();
    return true;
  }
  return false;
}

function evalState() {
  const result = evaluateLevel(level, assignment, { calm });
  const won = isWin(level, assignment, { calm });
  if (!result.ok) return { result, won: false };
  return { result, won };
}

function relatedHighlight() {
  if (!highlightRuleId || !level) return { chars: [], seats: [] };
  const rule = level.rules.find((r) => r.id === highlightRuleId);
  if (!rule) return { chars: [], seats: [] };
  return ruleRelated(rule);
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
  el.addEventListener("click", (ev) => {
    ev.stopPropagation();
    if (propMode === "calm_bell") {
      tryApplyCalm(charId);
      return;
    }
    if (selectedChar && selectedChar !== charId) {
      const targetSeat = assignment[charId];
      if (targetSeat) {
        commitAction(selectedChar, targetSeat);
        return;
      }
    }
    selectedChar = selectedChar === charId ? null : charId;
    render();
  });
  return el;
}

function onSeatClick(ev) {
  if (propMode) return;
  const seat = ev.currentTarget.dataset.seat;
  if (!selectedChar) return;
  commitAction(selectedChar, seat);
}

function expose() {
  const { result, won } = level ? evalState() : { result: { ok: false, rules: [], errors: ["no-level"] }, won: false };
  window.__CANDIDATE_PLAYTEST__ = {
    kind: "candidates-only",
    shippedClaim: false,
    fileId,
    levelId: level ? level.id : null,
    title: level ? level.title : null,
    assignment: cloneAssignment(assignment),
    calm: [...calm],
    inventory: cloneInventory(inventory),
    historyLen: playHistory.length,
    selectedChar,
    won,
    evalOk: result.ok,
    rules: result.ok ? result.rules : [],
    place(charId, seat) {
      return commitAction(charId, seat);
    },
    async load(id) {
      await switchCandidate(id);
      return window.__CANDIDATE_PLAYTEST__.levelId;
    },
  };
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
  h1.textContent = `候选试玩 · ${level.id} ${level.title}`;
  header.appendChild(h1);

  const pick = document.createElement("div");
  pick.className = "cand-pick";
  const sel = document.createElement("select");
  sel.setAttribute("aria-label", "选择候选关 c01–c12（非正式 / candidates only）");
  for (const id of CANDIDATE_FILES) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = id.toUpperCase();
    if (id === fileId) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => { switchCandidate(sel.value).catch((e) => console.error(e)); });
  pick.appendChild(sel);
  header.appendChild(pick);

  const undoBtn = document.createElement("button");
  undoBtn.className = "btn";
  undoBtn.type = "button";
  undoBtn.textContent = "撤销";
  undoBtn.disabled = playHistory.length === 0;
  undoBtn.addEventListener("click", () => undo());
  header.appendChild(undoBtn);

  const resetBtn = document.createElement("button");
  resetBtn.className = "btn";
  resetBtn.type = "button";
  resetBtn.textContent = "重玩";
  resetBtn.addEventListener("click", () => resetCandidate());
  header.appendChild(resetBtn);
  app.appendChild(header);

  const note = document.createElement("div");
  note.className = "cand-note";
  note.textContent = "候选草稿（candidates）· 非正式 levels · 不写产品存档 · L01–L03 提示表不适用 · 见 ../PLAYTEST.md";
  app.appendChild(note);

  if (message) {
    const msg = document.createElement("div");
    msg.className = "storage-msg";
    msg.textContent = message;
    msg.addEventListener("click", () => {
      message = "";
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
    status.textContent = "候选局面满足（非正式通关，非产品开席）";
  } else {
    const seated = level.characters.filter((c) => assignment[c]).length;
    const invBits = hasBell ? ` · 安心铃×${bellStock}` : "";
    status.textContent = `已入座 ${seated}/${level.characters.length} · 历史 ${playHistory.length}${invBits} · 点选角色再点座位`;
  }
  app.appendChild(status);

  if (hasBell) {
    const tools = document.createElement("div");
    tools.className = "tools";
    const bellBtn = document.createElement("button");
    bellBtn.className = "btn" + (propMode === "calm_bell" ? " active primary" : "");
    bellBtn.type = "button";
    bellBtn.textContent = propMode === "calm_bell"
      ? `点选目标（铃×${bellStock}）`
      : `安心铃 ×${bellStock}`;
    bellBtn.disabled = bellStock < 1 && propMode !== "calm_bell";
    bellBtn.addEventListener("click", () => {
      propMode = propMode === "calm_bell" ? null : "calm_bell";
      selectedChar = null;
      if (propMode) message = "请点选有效目标（候选 calm_bell；无效不消耗）";
      render();
    });
    tools.appendChild(bellBtn);
    app.appendChild(tools);
  }

  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const grid = document.createElement("div");
  grid.className = `table-grid ${layoutClass}`;
  for (const seat of seats) {
    const seatEl = document.createElement("div");
    seatEl.className = "seat";
    seatEl.dataset.seat = seat;
    seatEl.style.setProperty("--seat-area", seat);
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
  wh.textContent = "候客区（候选草稿）";
  waiting.appendChild(wh);
  const row = document.createElement("div");
  row.className = "waiting-row";
  for (const c of level.characters) {
    if (!assignment[c]) row.appendChild(makeCharEl(c));
  }
  waiting.appendChild(row);
  app.appendChild(waiting);

  const rulesBox = document.createElement("div");
  rulesBox.className = "rules";
  const rh = document.createElement("h2");
  rh.textContent = "规则状态（候选草稿 / 复用产品 evaluateLevel）";
  rulesBox.appendChild(rh);
  if (!result.ok) {
    const p = document.createElement("div");
    p.className = "hint";
    p.textContent = "评估未通过（ok=false）。";
    rulesBox.appendChild(p);
  } else {
    for (const rr of result.rules) {
      const rule = level.rules.find((r) => r.id === rr.id);
      const meta = STATUS_META[rr.status] || STATUS_META.PENDING;
      const el = document.createElement("div");
      el.className = `rule ${meta.className}` + (highlightRuleId === rr.id ? " active" : "");
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
    "操作：先点候客/角色，再点座位（入座/交换/挤占）。安心铃：点按钮再点目标。不使用产品存档键。file:// 下 ESM 通常失败，请用 README 中的 http.server。";
  app.appendChild(hint);

  expose();
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const start = (params.get("c") || params.get("candidate") || "c01").toLowerCase();
  const id = CANDIDATE_FILES.includes(start) ? start : "c01";
  try {
    await switchCandidate(id);
    // Optional headless helper: ?smoke=1 places first guest on first seat (c01 → fox/A1).
    if (params.get("smoke") === "1" && level) {
      commitAction(level.characters[0], level.seats[0]);
    }
  } catch (e) {
    if (app) {
      app.textContent = `启动失败：${e.message}。请从 banquet-pilot/ 根目录用 python3 -m http.server 打开 /candidates/playtest/（file:// 下 ESM/fetch 通常被拦）。`;
    }
    throw e;
  }
}

boot().catch((e) => {
  console.error(e);
});
