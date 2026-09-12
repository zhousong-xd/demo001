/** Pure board / game state for Banquet Pilot graybox (T-003/T-004).
 * No DOM. Assignment: charId -> seatId | null (null = waiting).
 * T-004: calm Set + prop inventory + full snapshots for undo.
 */

/**
 * @param {object} level
 * @returns {Record<string, string|null>}
 */
export function createInitialAssignment(level) {
  /** @type {Record<string, string|null>} */
  const asg = {};
  for (const c of level.characters) asg[c] = null;
  return asg;
}

/**
 * Initial prop stocks from level definition (cannot farm via restart).
 * @param {object} level
 * @returns {Record<string, number>}
 */
export function createInitialInventory(level) {
  /** @type {Record<string, number>} */
  const inv = {};
  for (const p of level.props || []) {
    if (p && typeof p.id === "string") {
      inv[p.id] = typeof p.stock === "number" ? p.stock : 0;
    }
  }
  return inv;
}

/**
 * @param {Record<string, string|null>} assignment
 * @returns {Record<string, string|null>}
 */
export function cloneAssignment(assignment) {
  return { ...assignment };
}

/**
 * @param {Iterable<string>} calm
 * @returns {Set<string>}
 */
export function cloneCalm(calm) {
  return new Set(calm);
}

/**
 * @param {Record<string, number>} inventory
 * @returns {Record<string, number>}
 */
export function cloneInventory(inventory) {
  return { ...inventory };
}

/**
 * Full undoable snapshot (assignment + calm + inventory).
 * @param {{ assignment: Record<string, string|null>, calm: Iterable<string>, inventory: Record<string, number> }} state
 */
export function snapshotPlay(state) {
  return {
    assignment: cloneAssignment(state.assignment),
    calm: [...state.calm],
    inventory: cloneInventory(state.inventory),
  };
}

/**
 * @param {{ assignment: Record<string, string|null>, calm: string[], inventory: Record<string, number> }} snap
 */
export function restorePlay(snap) {
  return {
    assignment: cloneAssignment(snap.assignment),
    calm: new Set(snap.calm || []),
    inventory: cloneInventory(snap.inventory || {}),
  };
}

/**
 * Who sits on seat, or null.
 * @param {Record<string, string|null>} assignment
 * @param {string} seat
 */
export function occupantOf(assignment, seat) {
  for (const [charId, s] of Object.entries(assignment)) {
    if (s === seat) return charId;
  }
  return null;
}

/**
 * Apply place/move/swap/displace. Returns null if no-op (same seat / invalid).
 * Never mutates input. Calm is character-scoped and follows moves automatically.
 *
 * @param {Record<string, string|null>} assignment
 * @param {string} charId
 * @param {string} seat
 * @param {string[]} availableSeats
 * @returns {{ next: Record<string, string|null>, kind: 'move'|'swap'|'displace' } | null}
 */
export function applySeatAction(assignment, charId, seat, availableSeats) {
  if (!Object.prototype.hasOwnProperty.call(assignment, charId)) return null;
  if (!availableSeats.includes(seat)) return null;

  const from = assignment[charId] ?? null;
  if (from === seat) return null; // same-seat click / drop

  const other = occupantOf(assignment, seat);
  const next = cloneAssignment(assignment);

  if (other === null) {
    next[charId] = seat;
    return { next, kind: "move" };
  }

  if (other === charId) return null;

  if (from !== null) {
    // atomic swap of two seated characters
    next[charId] = seat;
    next[other] = from;
    return { next, kind: "swap" };
  }

  // waiting guest onto occupied seat → displace occupant to waiting
  next[charId] = seat;
  next[other] = null;
  return { next, kind: "displace" };
}

/**
 * Apply a prop that grants calm (e.g. calm_bell).
 * - Invalid target → no consume
 * - Already calm on valid target → no extra consume (idempotent)
 * - Fresh valid target with stock → consume 1, add to calm
 * Never mutates input when returning a next state; caller pushes history.
 *
 * @param {{ assignment: Record<string, string|null>, calm: Set<string>, inventory: Record<string, number> }} state
 * @param {string} propId
 * @param {string} targetChar
 * @param {object} level
 * @returns {{
 *   ok: boolean,
 *   consumed: boolean,
 *   reason: string,
 *   next: { assignment: Record<string, string|null>, calm: Set<string>, inventory: Record<string, number> } | null
 * }}
 */
export function applyCalmProp(state, propId, targetChar, level) {
  const props = Array.isArray(level.props) ? level.props : [];
  const prop = props.find((p) => p && p.id === propId);
  if (!prop) {
    return { ok: false, consumed: false, reason: "no-prop", next: null };
  }
  if (!Object.prototype.hasOwnProperty.call(state.assignment, targetChar)) {
    return { ok: false, consumed: false, reason: "unknown-char", next: null };
  }
  const targets = prop.valid_targets || [];
  if (!targets.includes(targetChar)) {
    return { ok: false, consumed: false, reason: "invalid-target", next: null };
  }
  if (state.calm.has(targetChar)) {
    // Repeat on already-calm: success semantics, no extra consume, no state change
    return { ok: true, consumed: false, reason: "already-calm", next: null };
  }
  const stock = state.inventory[propId] ?? 0;
  if (stock < 1) {
    return { ok: false, consumed: false, reason: "no-stock", next: null };
  }
  const next = {
    assignment: cloneAssignment(state.assignment),
    calm: cloneCalm(state.calm),
    inventory: cloneInventory(state.inventory),
  };
  next.calm.add(targetChar);
  next.inventory[propId] = stock - 1;
  return { ok: true, consumed: true, reason: "applied", next };
}

/**
 * Undo stack stores full play snapshots (T-004) OR legacy assignment-only
 * (kept for older pushHistory callers). Prefer pushPlayHistory / popPlayHistory.
 */
export function createHistory() {
  return /** @type {any[]} */ ([]);
}

/**
 * @param {any[]} history
 * @param {Record<string, string|null>} assignmentBefore
 */
export function pushHistory(history, assignmentBefore) {
  history.push(cloneAssignment(assignmentBefore));
}

/**
 * @param {any[]} history
 * @returns {Record<string, string|null> | null}
 */
export function popHistory(history) {
  if (history.length === 0) return null;
  return history.pop() ?? null;
}

/**
 * @param {any[]} history
 * @param {{ assignment: Record<string, string|null>, calm: Iterable<string>, inventory: Record<string, number> }} stateBefore
 */
export function pushPlayHistory(history, stateBefore) {
  history.push(snapshotPlay(stateBefore));
}

/**
 * @param {any[]} history
 * @returns {{ assignment: Record<string, string|null>, calm: Set<string>, inventory: Record<string, number> } | null}
 */
export function popPlayHistory(history) {
  if (history.length === 0) return null;
  const snap = history.pop();
  if (!snap) return null;
  // Legacy: plain assignment object (no calm/inventory keys as arrays)
  if (
    snap.assignment === undefined &&
    snap.calm === undefined &&
    snap.inventory === undefined
  ) {
    return {
      assignment: cloneAssignment(snap),
      calm: new Set(),
      inventory: {},
    };
  }
  return restorePlay(snap);
}

/**
 * Integrity: no duplicate seats, only known chars, seats in available or null.
 * @param {Record<string, string|null>} assignment
 * @param {string[]} characters
 * @param {string[]} availableSeats
 */
export function assertBoardIntegrity(assignment, characters, availableSeats) {
  const seen = new Set();
  for (const c of characters) {
    if (!Object.prototype.hasOwnProperty.call(assignment, c)) {
      throw new Error(`missing char ${c}`);
    }
    const s = assignment[c];
    if (s === null || s === undefined || s === "") continue;
    if (!availableSeats.includes(s)) throw new Error(`illegal seat ${s}`);
    if (seen.has(s)) throw new Error(`double occupy ${s}`);
    seen.add(s);
  }
  for (const k of Object.keys(assignment)) {
    if (!characters.includes(k)) throw new Error(`unknown char ${k}`);
  }
  return true;
}
