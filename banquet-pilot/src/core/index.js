/** Banquet Pilot production kernel (native JS / ESM).
 * Pure browser entry: geometry + rules (+ optional solver).
 * Node JSON loading lives in loader.js — do NOT re-export it here
 * (keeps the static module graph free of node: dependencies).
 */

export {
  parseSeat,
  seatsForLayout,
  adjacent,
  faces,
  isEnd,
} from "./geometry.js";

export {
  PENDING,
  SATISFIED,
  CONFLICT,
  evaluateRule,
  validateAssignment,
  validateLevel,
  validatePlayable,
  resolveEffectiveCalm,
  evaluateLevel,
  isWin,
} from "./rules.js";

export { enumerateSolutions, countSolutions } from "./solver.js";
