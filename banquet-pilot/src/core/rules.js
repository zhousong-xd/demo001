/** Rule evaluation: PENDING / SATISFIED / CONFLICT + level/calm validation. */

import { adjacent, faces, isEnd, parseSeat, seatsForLayout } from "./geometry.js";

export const PENDING = "PENDING";
export const SATISFIED = "SATISFIED";
export const CONFLICT = "CONFLICT";

const KNOWN_KINDS = new Set([
  "at",
  "not_beside",
  "faces",
  "end",
  "same_row",
  "not_faces_unless",
]);

/**
 * @param {Record<string, string|null|undefined>} assignment
 * @param {string} charId
 * @returns {string|null}
 */
function seated(assignment, charId) {
  const seat = assignment[charId];
  if (seat === null || seat === undefined || seat === "") return null;
  return seat;
}

/**
 * @param {object} rule
 * @param {Record<string, string|null|undefined>} assignment
 * @param {{ availableSeats: string[], calm?: Iterable<string> }} opts
 */
export function evaluateRule(rule, assignment, { availableSeats, calm = [] } = {}) {
  const calmSet = calm instanceof Set ? calm : new Set(calm);
  const kind = rule.kind;
  const subject = rule.subject;

  if (kind === "at") {
    const seat = seated(assignment, subject);
    if (seat === null) return PENDING;
    return seat === rule.seat ? SATISFIED : CONFLICT;
  }

  if (kind === "not_beside") {
    const other = rule.other;
    const a = seated(assignment, subject);
    const b = seated(assignment, other);
    if (a === null || b === null) return PENDING;
    return adjacent(a, b) ? CONFLICT : SATISFIED;
  }

  if (kind === "faces") {
    const other = rule.other;
    const a = seated(assignment, subject);
    const b = seated(assignment, other);
    if (a === null || b === null) return PENDING;
    return faces(a, b) ? SATISFIED : CONFLICT;
  }

  if (kind === "end") {
    const seat = seated(assignment, subject);
    if (seat === null) return PENDING;
    return isEnd(seat, availableSeats) ? SATISFIED : CONFLICT;
  }

  if (kind === "same_row") {
    const other = rule.other;
    const a = seated(assignment, subject);
    const b = seated(assignment, other);
    if (a === null || b === null) return PENDING;
    return parseSeat(a)[0] === parseSeat(b)[0] ? SATISFIED : CONFLICT;
  }

  if (kind === "not_faces_unless") {
    const other = rule.other;
    const required = rule.unless_state ?? "calm";
    const a = seated(assignment, subject);
    const b = seated(assignment, other);
    if (a === null || b === null) return PENDING;
    if (required === "calm" && calmSet.has(subject)) return SATISFIED;
    if (faces(a, b)) return CONFLICT;
    return SATISFIED;
  }

  throw new Error(`unknown rule kind: ${JSON.stringify(kind)}`);
}

/**
 * @param {Record<string, string|null|undefined>} assignment
 * @param {{ characters: string[], availableSeats: string[], calm?: Iterable<string> }} opts
 * @returns {string[]}
 */
export function validateAssignment(
  assignment,
  { characters, availableSeats, calm = [] } = {},
) {
  const errors = [];
  const calmSet = calm instanceof Set ? calm : new Set(calm);
  const charSet = new Set(characters);
  const seatSet = new Set(availableSeats);

  for (const cid of Object.keys(assignment)) {
    if (!charSet.has(cid)) errors.push(`illegal character id: ${cid}`);
  }

  /** @type {Record<string, string>} */
  const occupied = {};
  for (const [cid, seat] of Object.entries(assignment)) {
    if (seat === null || seat === undefined || seat === "") continue;
    try {
      parseSeat(seat);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
      continue;
    }
    if (!seatSet.has(seat)) {
      errors.push(`seat ${seat} not available in this level`);
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(occupied, seat)) {
      errors.push(`duplicate seat ${seat}: ${occupied[seat]} and ${cid}`);
    } else {
      occupied[seat] = cid;
    }
  }

  for (const cid of calmSet) {
    if (!charSet.has(cid)) errors.push(`calm on unknown character: ${cid}`);
  }

  return errors;
}

/**
 * Effective calm = explicit calm ∪ initial_calm, with prop/stock/target checks.
 * @param {object} level
 * @param {Iterable<string>|null|undefined} calm
 * @returns {{ effective: Set<string>, errors: string[] }}
 */
export function resolveEffectiveCalm(level, calm = null) {
  const errors = [];
  const characters = level.characters || [];
  const charSet = new Set(characters);
  const props = Array.isArray(level.props) ? level.props : [];
  const initial = level.initial_calm || [];
  const explicit = calm == null ? [] : calm;
  const effective = new Set([...initial, ...explicit]);

  for (const cid of effective) {
    if (!charSet.has(cid)) {
      errors.push(`calm on unknown character: ${cid}`);
    }
  }

  if (props.length === 0) {
    if (effective.size > 0) {
      errors.push("calm illegal: level has no props that can grant calm");
    }
    return { effective, errors };
  }

  /** @type {Set<string>} */
  const validTargets = new Set();
  let calmStock = 0;
  for (const prop of props) {
    const targets = prop.valid_targets || [];
    for (const t of targets) validTargets.add(t);
    if (targets.length > 0) {
      calmStock += Number(prop.stock ?? 0);
    }
  }

  for (const cid of effective) {
    if (charSet.has(cid) && !validTargets.has(cid)) {
      errors.push(`calm target not in any prop.valid_targets: ${cid}`);
    }
  }

  if (effective.size > calmStock) {
    errors.push(
      `calm effects ${effective.size} exceed available calm stock ${calmStock}`,
    );
  }

  return { effective, errors };
}

/**
 * Structural validation of a level definition.
 * @param {object} level
 * @returns {string[]}
 */
export function validateLevel(level) {
  const errors = [];
  const characters = level.characters || [];
  const available = level.seats || seatsForLayout(level.layout);
  const rules = level.rules || [];

  const seenChars = new Set();
  for (const c of characters) {
    if (seenChars.has(c)) errors.push(`duplicate character id: ${c}`);
    else seenChars.add(c);
  }

  const seenSeats = new Set();
  for (const s of available) {
    if (seenSeats.has(s)) errors.push(`duplicate seat id: ${s}`);
    else {
      try {
        parseSeat(s);
        seenSeats.add(s);
      } catch (e) {
        errors.push(e instanceof Error ? e.message : String(e));
      }
    }
  }

  const seenRuleIds = new Set();
  for (const rule of rules) {
    const rid = rule.id;
    if (rid != null && rid !== "") {
      if (seenRuleIds.has(rid)) {
        errors.push(`duplicate rule id: ${rid}`);
      } else {
        seenRuleIds.add(rid);
      }
    }
    if (!KNOWN_KINDS.has(rule.kind)) {
      errors.push(`unknown rule kind: ${JSON.stringify(rule.kind)}`);
    }
    if (rule.subject != null && !seenChars.has(rule.subject)) {
      errors.push(`rule subject not in characters: ${rule.subject}`);
    }
    if (rule.other != null && !seenChars.has(rule.other)) {
      errors.push(`rule other not in characters: ${rule.other}`);
    }
    if (rule.kind === "at" && rule.seat != null && !seenSeats.has(rule.seat)) {
      errors.push(`rule seat not available: ${rule.seat}`);
    }
  }

  // also validate initial_calm / props via calm resolver (no explicit calm)
  const { errors: calmErrs } = resolveEffectiveCalm(level, null);
  for (const e of calmErrs) errors.push(e);

  return errors;
}

/**
 * Evaluate every rule as a list (no silent id overwrite).
 * @returns {{ id: string, status: string }[]}
 */
export function evaluateLevel(level, assignment, { calm = null } = {}) {
  const available = level.seats || seatsForLayout(level.layout);
  const { effective } = resolveEffectiveCalm(level, calm);
  const results = [];
  for (const rule of level.rules) {
    const rid = rule.id || `${rule.kind}:${rule.subject}`;
    results.push({
      id: rid,
      status: evaluateRule(rule, assignment, {
        availableSeats: available,
        calm: effective,
      }),
    });
  }
  return results;
}

/**
 * @param {object} level
 * @param {Record<string, string|null|undefined>} assignment
 * @param {{ calm?: Iterable<string>|null }} opts
 */
export function isWin(level, assignment, { calm = null } = {}) {
  if (validateLevel(level).length > 0) return false;

  const characters = level.characters;
  const available = level.seats || seatsForLayout(level.layout);
  const { effective, errors: calmErrors } = resolveEffectiveCalm(level, calm);
  if (calmErrors.length > 0) return false;

  if (
    validateAssignment(assignment, {
      characters,
      availableSeats: available,
      calm: effective,
    }).length > 0
  ) {
    return false;
  }

  const seats = characters.map((c) => seated(assignment, c));
  if (seats.some((s) => s === null)) return false;
  if (new Set(seats).size !== seats.length) return false;
  if (seats.some((s) => !available.includes(/** @type {string} */ (s)))) return false;

  // iterate rules as a list — all must be SATISFIED
  for (const rule of level.rules) {
    const status = evaluateRule(rule, assignment, {
      availableSeats: available,
      calm: effective,
    });
    if (status !== SATISFIED) return false;
  }
  return true;
}
