/** Banquet Pilot production kernel (native JS / ESM). */

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
  resolveEffectiveCalm,
  evaluateLevel,
  isWin,
} from "./rules.js";

export { loadLevel, loadAllLevels, LEVELS_DIR } from "./loader.js";

export { enumerateSolutions, countSolutions } from "./solver.js";
