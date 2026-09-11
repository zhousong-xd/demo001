/** Rule evaluation: PENDING / SATISFIED / CONFLICT + level/calm validation.
 *
 * Public evaluation entry: evaluateLevel / isWin / validatePlayable.
 * evaluateRule is low-level and assumes already-validated inputs —
 * UI must not bypass evaluateLevel.
 */

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

/** Kinds that require `other`. */
const NEEDS_OTHER = new Set(["not_beside", "faces", "same_row", "not_faces_unless"]);

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
 * Low-level rule evaluator. Assumes inputs already passed validatePlayable /
 * validateLevel. UI must not call this to bypass the public evaluateLevel path.
 *
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
 * True iff stock is a finite non-negative integer (no Number() coercion of strings).
 * @param {unknown} stock
 */
function isValidStock(stock) {
  return (
    typeof stock === "number" &&
    Number.isFinite(stock) &&
    Number.isInteger(stock) &&
    stock >= 0
  );
}

/**
 * Effective calm = explicit calm ∪ initial_calm, with prop/stock/target checks.
 * Does not Number()-coerce bad stock; invalid stock pushes an error and is
 * excluded from the calm-stock sum.
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
      if (!isValidStock(prop.stock)) {
        errors.push(
          `prop ${prop.id ?? "(missing id)"} stock must be a finite non-negative integer, got ${JSON.stringify(prop.stock)}`,
        );
      } else {
        calmStock += prop.stock;
      }
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
  const props = Array.isArray(level.props) ? level.props : [];
  const initial = level.initial_calm || [];

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
    if (rid == null || rid === "") {
      errors.push("rule missing required field: id");
    } else if (seenRuleIds.has(rid)) {
      errors.push(`duplicate rule id: ${rid}`);
    } else {
      seenRuleIds.add(rid);
    }

    if (rule.kind == null || rule.kind === "") {
      errors.push(`rule ${rid ?? "(no id)"} missing required field: kind`);
    } else if (!KNOWN_KINDS.has(rule.kind)) {
      errors.push(`unknown rule kind: ${JSON.stringify(rule.kind)}`);
    }

    if (rule.subject == null || rule.subject === "") {
      errors.push(`rule ${rid ?? "(no id)"} missing required field: subject`);
    } else if (!seenChars.has(rule.subject)) {
      errors.push(`rule subject not in characters: ${rule.subject}`);
    }

    if (rule.kind === "at") {
      if (rule.seat == null || rule.seat === "") {
        errors.push(`rule ${rid ?? "(no id)"} kind at missing required field: seat`);
      } else if (!seenSeats.has(rule.seat)) {
        errors.push(`rule seat not available: ${rule.seat}`);
      }
    }

    if (NEEDS_OTHER.has(rule.kind)) {
      if (rule.other == null || rule.other === "") {
        errors.push(
          `rule ${rid ?? "(no id)"} kind ${rule.kind} missing required field: other`,
        );
      } else if (!seenChars.has(rule.other)) {
        errors.push(`rule other not in characters: ${rule.other}`);
      }
    }

    // not_faces_unless: missing unless_state OK (default calm);
    // explicit null/''/unknown REJECT; only 'calm' allowed when present.
    if (rule.kind === "not_faces_unless" && Object.prototype.hasOwnProperty.call(rule, "unless_state")) {
      if (rule.unless_state !== "calm") {
        errors.push(
          `rule ${rid ?? "(no id)"} unless_state must be 'calm' when present, got ${JSON.stringify(rule.unless_state)}`,
        );
      }
    }
  }

  const seenPropIds = new Set();
  for (const prop of props) {
    const pid = prop.id;
    if (pid == null || pid === "") {
      errors.push("prop missing required field: id");
    } else if (seenPropIds.has(pid)) {
      errors.push(`duplicate prop id: ${pid}`);
    } else {
      seenPropIds.add(pid);
    }

    if (!isValidStock(prop.stock)) {
      errors.push(
        `prop ${pid ?? "(missing id)"} stock must be a finite non-negative integer, got ${JSON.stringify(prop.stock)}`,
      );
    }

    const targets = prop.valid_targets || [];
    for (const t of targets) {
      if (!seenChars.has(t)) {
        errors.push(`prop ${pid ?? "(missing id)"} valid_targets includes unknown character: ${t}`);
      }
    }
  }

  for (const cid of initial) {
    if (!seenChars.has(cid)) {
      errors.push(`initial_calm unknown character: ${cid}`);
    }
  }

  // calm grantability (stock/targets/no-props) via resolveEffectiveCalm
  const { errors: calmErrs } = resolveEffectiveCalm(level, null);
  for (const e of calmErrs) {
    // avoid duplicating stock errors already reported above
    if (e.includes("stock must be a finite")) continue;
    errors.push(e);
  }

  return errors;
}

/**
 * Unified playable-state validation entry.
 * 1) validateLevel — stop on config errors
 * 2) resolveEffectiveCalm — collect errors
 * 3) validateAssignment with effectiveCalm
 * @param {object} level
 * @param {Record<string, string|null|undefined>} assignment
 * @param {{ calm?: Iterable<string>|null }} opts
 * @returns {{ ok: boolean, errors: string[], effectiveCalm: Set<string> }}
 */
export function validatePlayable(level, assignment, { calm = null } = {}) {
  const levelErrors = validateLevel(level);
  if (levelErrors.length > 0) {
    return { ok: false, errors: levelErrors, effectiveCalm: new Set() };
  }

  const available = level.seats || seatsForLayout(level.layout);
  const { effective, errors: calmErrors } = resolveEffectiveCalm(level, calm);
  const errors = [...calmErrors];

  const asgErrors = validateAssignment(assignment, {
    characters: level.characters,
    availableSeats: available,
    calm: effective,
  });
  for (const e of asgErrors) errors.push(e);

  return {
    ok: errors.length === 0,
    errors,
    effectiveCalm: effective,
  };
}

/**
 * Evaluate every rule. ALWAYS returns structured result:
 *   legal:   { ok:true,  errors:[], rules:[{id,status}, ...] }
 *   illegal: { ok:false, errors:[...], rules:[] }
 * Never returns SATISFIED for illegal configs.
 *
 * @param {object} level
 * @param {Record<string, string|null|undefined>} assignment
 * @param {{ calm?: Iterable<string>|null }} opts
 * @returns {{ ok: boolean, errors: string[], rules: {id:string,status:string}[] }}
 */
export function evaluateLevel(level, assignment, { calm = null } = {}) {
  const playable = validatePlayable(level, assignment, { calm });
  if (!playable.ok) {
    return { ok: false, errors: playable.errors, rules: [] };
  }

  const available = level.seats || seatsForLayout(level.layout);
  const results = [];
  for (const rule of level.rules) {
    results.push({
      id: rule.id,
      status: evaluateRule(rule, assignment, {
        availableSeats: available,
        calm: playable.effectiveCalm,
      }),
    });
  }
  return { ok: true, errors: [], rules: results };
}

/**
 * Win iff evaluateLevel ok, every character seated, and all rules SATISFIED.
 * Reuses the same validation path as evaluateLevel (no second checker).
 *
 * @param {object} level
 * @param {Record<string, string|null|undefined>} assignment
 * @param {{ calm?: Iterable<string>|null }} opts
 */
export function isWin(level, assignment, { calm = null } = {}) {
  const result = evaluateLevel(level, assignment, { calm });
  if (!result.ok) return false;

  const characters = level.characters;
  for (const c of characters) {
    if (seated(assignment, c) === null) return false;
  }

  return result.rules.every((r) => r.status === SATISFIED);
}
