import { evaluateLevel, isWin } from "../../src/core/rules.js";
import { applySeatAction, applyCalmProp, snapshotPlay, restorePlay, assertBoardIntegrity } from "../../src/ui/board.js";

export const WARM_LEVEL = {
  id: "warm-table-sample", layout: "4", seats: ["A1", "A2", "B1", "B2"],
  characters: ["fox", "rabbit"],
  props: [{ id: "calm_bell", stock: 1, valid_targets: ["rabbit"] }],
  rules: [
    { id: "window", kind: "at", subject: "fox", seat: "A1" },
    { id: "eye-contact", kind: "not_faces_unless", subject: "rabbit", other: "fox", unless_state: "calm" }
  ]
};

export function createWarmTable() {
  let play;
  let playHistory = [];
  let moves = 0;
  const initial = () => ({ assignment: { fox: "A1", rabbit: "B1" }, calm: new Set(), inventory: { calm_bell: 1 } });
  play = initial();
  function read() {
    const result = evaluateLevel(WARM_LEVEL, play.assignment, { calm: play.calm });
    return { ...snapshotPlay(play), result, won: isWin(WARM_LEVEL, play.assignment, { calm: play.calm }), moves, historyLength: playHistory.length };
  }
  function commit(next) {
    assertBoardIntegrity(next.assignment, WARM_LEVEL.characters, WARM_LEVEL.seats);
    playHistory.push({ play: snapshotPlay(play), moves });
    if (playHistory.length > 100) playHistory.shift();
    play = next;
    moves += 1;
    return read();
  }
  function move(character, seat) {
    const action = applySeatAction(play.assignment, character, seat, WARM_LEVEL.seats);
    if (!action) return { changed: false, reason: "noop" };
    commit({ ...play, assignment: action.next });
    return { changed: true, kind: action.kind };
  }
  function preview(character, seat) {
    const action = applySeatAction(play.assignment, character, seat, WARM_LEVEL.seats);
    if (!action) return null;
    const result = evaluateLevel(WARM_LEVEL, action.next, { calm: play.calm });
    return { kind: action.kind, result, won: isWin(WARM_LEVEL, action.next, { calm: play.calm }), assignment: action.next };
  }
  function wait(character) {
    if (!WARM_LEVEL.characters.includes(character) || play.assignment[character] === null) return { changed: false };
    commit({ ...play, assignment: { ...play.assignment, [character]: null } });
    return { changed: true, kind: "waiting" };
  }
  function bell(character) {
    const action = applyCalmProp(play, "calm_bell", character, WARM_LEVEL);
    if (action.next) commit(action.next);
    return { changed: !!action.next, reason: action.reason };
  }
  function undo() {
    const previous = playHistory.pop();
    if (!previous) return false;
    play = restorePlay(previous.play);
    moves = previous.moves;
    return true;
  }
  function reset() { play = initial(); playHistory = []; moves = 0; return read(); }
  return Object.freeze({ read, move, preview, wait, bell, undo, reset });
}
