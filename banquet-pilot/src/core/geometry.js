/** Seat geometry for Banquet Pilot (browser-reusable ESM).
 *
 * Rows A (top) and B (bottom); column index increases left → right.
 * - adjacent: same row and |index| == 1 (never across the table; never diagonal)
 * - faces: different row and same column index
 * - end: leftmost or rightmost *available* seat in that row for the level
 */

/**
 * @param {string} seat
 * @returns {[string, number]}
 */
export function parseSeat(seat) {
  if (
    typeof seat !== "string" ||
    seat.length < 2 ||
    (seat[0] !== "A" && seat[0] !== "B") ||
    !/^\d+$/.test(seat.slice(1))
  ) {
    throw new Error(`illegal seat id: ${JSON.stringify(seat)}`);
  }
  return [seat[0], Number(seat.slice(1))];
}

/**
 * @param {string} layout
 * @returns {string[]}
 */
export function seatsForLayout(layout) {
  const key = String(layout).toLowerCase();
  if (key === "4" || key === "l01" || key === "four") {
    return ["A1", "A2", "B1", "B2"];
  }
  if (key === "6" || key === "l02" || key === "l03" || key === "six") {
    return ["A1", "A2", "A3", "B1", "B2", "B3"];
  }
  throw new Error(`unknown layout: ${JSON.stringify(layout)}`);
}

/**
 * @param {string} a
 * @param {string} b
 */
export function adjacent(a, b) {
  const [ra, ia] = parseSeat(a);
  const [rb, ib] = parseSeat(b);
  return ra === rb && Math.abs(ia - ib) === 1;
}

/**
 * @param {string} a
 * @param {string} b
 */
export function faces(a, b) {
  const [ra, ia] = parseSeat(a);
  const [rb, ib] = parseSeat(b);
  return ra !== rb && ia === ib;
}

/**
 * @param {string} seat
 * @param {string[]} available
 */
export function isEnd(seat, available) {
  if (!available.includes(seat)) return false;
  const [row] = parseSeat(seat);
  const rowSeats = available
    .filter((s) => parseSeat(s)[0] === row)
    .slice()
    .sort((x, y) => parseSeat(x)[1] - parseSeat(y)[1]);
  if (rowSeats.length === 0) return false;
  return seat === rowSeats[0] || seat === rowSeats[rowSeats.length - 1];
}
