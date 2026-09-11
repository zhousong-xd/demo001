/** Static full-seat enumerator (no UI). */

import { seatsForLayout } from "./geometry.js";
import { isWin } from "./rules.js";

/**
 * @param {string[]} arr
 * @returns {Generator<string[]>}
 */
function* permutations(arr) {
  const a = arr.slice();
  const n = a.length;
  if (n === 0) {
    yield [];
    return;
  }
  const c = new Array(n).fill(0);
  yield a.slice();
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      const k = i % 2 === 0 ? 0 : c[i];
      const tmp = a[k];
      a[k] = a[i];
      a[i] = tmp;
      yield a.slice();
      c[i] += 1;
      i = 0;
    } else {
      c[i] = 0;
      i += 1;
    }
  }
}

/**
 * @param {string[]} characters
 * @param {string[]} seats
 * @returns {Generator<Record<string, string>>}
 */
function* fullAssignments(characters, seats) {
  if (characters.length !== seats.length) {
    throw new Error(
      `enumerator requires |characters|==|seats|, got ${characters.length} vs ${seats.length}`,
    );
  }
  for (const perm of permutations(seats)) {
    /** @type {Record<string, string>} */
    const asg = {};
    for (let i = 0; i < characters.length; i++) asg[characters[i]] = perm[i];
    yield asg;
  }
}

/**
 * @param {object} level
 * @param {{ calm?: Iterable<string>|null }} opts
 */
export function enumerateSolutions(level, { calm = null } = {}) {
  const characters = level.characters;
  const seats = level.seats || seatsForLayout(level.layout);
  /** @type {Record<string, string>[]} */
  const solutions = [];
  for (const asg of fullAssignments(characters, seats)) {
    if (isWin(level, asg, { calm })) solutions.push(asg);
  }
  return solutions;
}

/**
 * @param {object} level
 * @param {{ calm?: Iterable<string>|null }} opts
 * @returns {[number, number]}
 */
export function countSolutions(level, { calm = null } = {}) {
  const characters = level.characters;
  const seats = level.seats || seatsForLayout(level.layout);
  let n = 0;
  let total = 0;
  for (const asg of fullAssignments(characters, seats)) {
    total += 1;
    if (isWin(level, asg, { calm })) n += 1;
  }
  return [n, total];
}
