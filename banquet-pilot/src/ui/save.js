/** Versioned local save / restore for Banquet Pilot (T-004). */

export const SAVE_VERSION = 1;
export const SAVE_KEY = "banquet-pilot-save-v1";

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
 * Structural + level-aware validation. Returns null if unusable.
 * @param {unknown} raw
 * @param {{ characters: string[], seats: string[], props?: {id:string}[] }} level
 * @returns {SavePayload | null}
 */
export function validateSavePayload(raw, level) {
  if (!raw || typeof raw !== "object") return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  if (o.version !== SAVE_VERSION) return null;
  if (typeof o.levelId !== "string") return null;
  if (!o.assignment || typeof o.assignment !== "object") return null;
  if (!Array.isArray(o.calm)) return null;
  if (!o.inventory || typeof o.inventory !== "object") return null;
  if (!Array.isArray(o.history)) return null;
  if (typeof o.hintTier !== "number" || o.hintTier < 0 || o.hintTier > 3) return null;
  if (!Array.isArray(o.clearedLevels)) return null;

  const chars = level.characters || [];
  const seats = level.seats || [];
  const asg = /** @type {Record<string, unknown>} */ (o.assignment);
  for (const c of chars) {
    if (!Object.prototype.hasOwnProperty.call(asg, c)) return null;
    const s = asg[c];
    if (s !== null && s !== undefined && s !== "" && !seats.includes(/** @type {string} */ (s))) {
      return null;
    }
  }
  for (const k of Object.keys(asg)) {
    if (!chars.includes(k)) return null;
  }
  // no double occupy
  const seen = new Set();
  for (const c of chars) {
    const s = asg[c];
    if (s === null || s === undefined || s === "") continue;
    if (seen.has(s)) return null;
    seen.add(s);
  }
  for (const cid of o.calm) {
    if (typeof cid !== "string" || !chars.includes(cid)) return null;
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
