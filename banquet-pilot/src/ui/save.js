/** Versioned local save / restore for Banquet Pilot (T-004). */

import { createInitialInventory } from "./board.js";

export const SAVE_VERSION = 1;
export const SAVE_KEY = "banquet-pilot-save-v1";

export const DEFAULT_KNOWN_LEVEL_IDS = ["L01", "L02", "L03"];

/**
 * @typedef {{
 *   version: number,
 *   levelId: string,
 *   assignment: Record<string, string|null>,
 *   calm: string[],
 *   inventory: Record<string, number>,
 *   history: any[],
 *   hintTier: number,
 *   clearedLevels: string[],
 *   savedAt: string,
 * }} SavePayload
 */

/**
 * @returns {{ available: boolean, reason?: string }}
 */
export function probeStorage() {
  try {
    const k = "__banquet_probe__";
    window.localStorage.setItem(k, "1");
    window.localStorage.removeItem(k);
    return { available: true };
  } catch (e) {
    return {
      available: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

/**
 * Validate assignment: known chars, known seats, no double occupy.
 * @param {unknown} assignment
 * @param {string[]} chars
 * @param {string[]} seats
 * @returns {boolean}
 */
function validateAssignment(assignment, chars, seats) {
  if (!assignment || typeof assignment !== "object" || Array.isArray(assignment)) {
    return false;
  }
  const asg = /** @type {Record<string, unknown>} */ (assignment);
  for (const c of chars) {
    if (!Object.prototype.hasOwnProperty.call(asg, c)) return false;
    const s = asg[c];
    if (s !== null && s !== undefined && s !== "" && !seats.includes(/** @type {string} */ (s))) {
      return false;
    }
  }
  for (const k of Object.keys(asg)) {
    if (!chars.includes(k)) return false;
  }
  const seen = new Set();
  for (const c of chars) {
    const s = asg[c];
    if (s === null || s === undefined || s === "") continue;
    if (seen.has(s)) return false;
    seen.add(s);
  }
  return true;
}

/**
 * Inventory + calm consistency vs level.props / createInitialInventory.
 * @param {unknown} inventory
 * @param {unknown} calm
 * @param {{ characters: string[], props?: {id:string, stock?:number, valid_targets?: string[]}[] }} level
 * @returns {boolean}
 */
function validateInventoryAndCalm(inventory, calm, level) {
  if (!inventory || typeof inventory !== "object" || Array.isArray(inventory)) {
    return false;
  }
  if (!Array.isArray(calm)) return false;

  const chars = level.characters || [];
  const props = Array.isArray(level.props) ? level.props : [];
  const initial = createInitialInventory(level);
  const inv = /** @type {Record<string, unknown>} */ (inventory);

  // Every known prop present; no extras
  for (const id of Object.keys(initial)) {
    if (!Object.prototype.hasOwnProperty.call(inv, id)) return false;
  }
  for (const k of Object.keys(inv)) {
    if (!Object.prototype.hasOwnProperty.call(initial, k)) return false;
  }

  for (const id of Object.keys(initial)) {
    const v = inv[id];
    if (typeof v !== "number" || !Number.isFinite(v) || !Number.isInteger(v)) {
      return false;
    }
    if (v < 0 || v > initial[id]) return false;
  }

  // Calm: unique known character strings
  const calmSeen = new Set();
  for (const cid of calm) {
    if (typeof cid !== "string" || !chars.includes(cid)) return false;
    if (calmSeen.has(cid)) return false;
    calmSeen.add(cid);
  }

  if (props.length === 0) {
    // No props ⇒ calm must be empty (already inventory empty via initial)
    return calm.length === 0;
  }

  // Each calm target must be a valid_target of some level prop
  const allValidTargets = new Set();
  for (const p of props) {
    if (!p || typeof p.id !== "string") continue;
    for (const t of p.valid_targets || []) {
      if (typeof t === "string") allValidTargets.add(t);
    }
  }
  for (const cid of calm) {
    if (!allValidTargets.has(cid)) return false;
  }

  // Consumed stock must match calm targets covered by that prop
  for (const p of props) {
    if (!p || typeof p.id !== "string") continue;
    const initialStock = initial[p.id] ?? 0;
    const currentStock = /** @type {number} */ (inv[p.id]);
    const consumed = initialStock - currentStock;
    const targets = Array.isArray(p.valid_targets) ? p.valid_targets : [];
    const calmHits = calm.filter((c) => targets.includes(c)).length;
    if (consumed !== calmHits) return false;
  }

  return true;
}

/**
 * Validate a play snapshot (current state or undo history entry).
 * @param {unknown} snap
 * @param {{ characters: string[], seats: string[], props?: any[] }} level
 * @returns {boolean}
 */
function validatePlaySnapshot(snap, level) {
  if (!snap || typeof snap !== "object" || Array.isArray(snap)) return false;
  const s = /** @type {Record<string, unknown>} */ (snap);
  // Reject legacy-ambiguous / undo-throwing shapes: calm MUST be an array
  if (!Array.isArray(s.calm)) return false;
  if (!validateAssignment(s.assignment, level.characters || [], level.seats || [])) {
    return false;
  }
  if (!validateInventoryAndCalm(s.inventory, s.calm, level)) {
    return false;
  }
  return true;
}

/**
 * Structural + level-aware validation. Returns null if unusable.
 * @param {unknown} raw
 * @param {{ characters: string[], seats: string[], props?: {id:string, stock?:number, valid_targets?: string[]}[] }} level
 * @param {string[]} [knownLevelIds]
 * @returns {SavePayload | null}
 */
export function validateSavePayload(raw, level, knownLevelIds = DEFAULT_KNOWN_LEVEL_IDS) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  if (o.version !== SAVE_VERSION) return null;
  if (typeof o.levelId !== "string") return null;
  if (!Array.isArray(o.history)) return null;
  if (!Number.isInteger(o.hintTier) || /** @type {number} */ (o.hintTier) < 0 || /** @type {number} */ (o.hintTier) > 3) {
    return null;
  }
  if (!Array.isArray(o.clearedLevels)) return null;
  for (const id of o.clearedLevels) {
    if (typeof id !== "string" || !knownLevelIds.includes(id)) return null;
  }

  // Current play state (assignment + calm + inventory)
  if (!validatePlaySnapshot(
    { assignment: o.assignment, calm: o.calm, inventory: o.inventory },
    level,
  )) {
    return null;
  }

  // Each undo history snapshot must be a safe play snapshot
  for (const entry of o.history) {
    if (!validatePlaySnapshot(entry, level)) return null;
  }

  return /** @type {SavePayload} */ (o);
}

/**
 * @param {SavePayload} payload
 * @returns {{ ok: true } | { ok: false, unavailable: boolean, message: string }}
 */
export function writeSave(payload) {
  const probe = probeStorage();
  if (!probe.available) {
    return {
      ok: false,
      unavailable: true,
      message: `本地存储不可用，进度无法保存（${probe.reason || "未知原因"}）`,
    };
  }
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      unavailable: true,
      message: `写入存档失败：${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * @returns {{ ok: true, data: unknown } | { ok: false, corrupt?: boolean, unavailable?: boolean, message: string, missing?: boolean }}
 */
export function readSaveRaw() {
  const probe = probeStorage();
  if (!probe.available) {
    return {
      ok: false,
      unavailable: true,
      message: `本地存储不可用（${probe.reason || "未知原因"}）`,
    };
  }
  try {
    const text = window.localStorage.getItem(SAVE_KEY);
    if (text == null || text === "") {
      return { ok: false, missing: true, message: "无存档" };
    }
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch {
      return { ok: false, corrupt: true, message: "存档损坏（JSON 无效）" };
    }
  } catch (e) {
    return {
      ok: false,
      unavailable: true,
      message: `读取存档失败：${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/**
 * Clear save key (used after corrupt recovery).
 */
export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
