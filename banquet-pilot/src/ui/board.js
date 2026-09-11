/** Pure board state for Banquet Pilot graybox (T-003).
 * No DOM. Assignment: charId -> seatId | null (null = waiting).
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
 * @param {Record<string, string|null>} assignment
 * @returns {Record<string, string|null>}
 */
export function cloneAssignment(assignment) {
  return { ...assignment };
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
 * Never mutates input.
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
 * Undo stack stores full assignments. push only when applySeatAction succeeds.
 */
export function createHistory() {
  return /** @type {Record<string, string|null>[]} */ ([]);
}

/**
 * @param {Record<string, string|null>[]} history
 * @param {Record<string, string|null>} assignmentBefore
 */
export function pushHistory(history, assignmentBefore) {
  history.push(cloneAssignment(assignmentBefore));
}

/**
 * @param {Record<string, string|null>[]} history
 * @returns {Record<string, string|null> | null}
 */
export function popHistory(history) {
  if (history.length === 0) return null;
  return history.pop() ?? null;
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
