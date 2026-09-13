export const VIEW_DIRECTIONS = ["S", "SW", "W", "NW", "N", "NE", "E", "SE"];
export const VIEW_LABELS = { S: "正面", SW: "左前", W: "左侧", NW: "左后", N: "背面", NE: "右后", E: "右侧", SE: "右前" };
export function seatFacing(seat) { return seat?.startsWith("A") ? "S" : seat?.startsWith("B") ? "N" : "S"; }
export function vectorFacing(deltaX, deltaY) {
  if (Math.abs(deltaX) + Math.abs(deltaY) < .01) return "S";
  const directions = ["E", "SE", "S", "SW", "W", "NW", "N", "NE"];
  return directions[(Math.round(Math.atan2(deltaY, deltaX) / (Math.PI / 4)) + 8) % 8];
}
export function gazeFacing(body, target, maximumSteps = 1) {
  const origin = VIEW_DIRECTIONS.indexOf(body);
  const destination = VIEW_DIRECTIONS.indexOf(target);
  const distance = (destination - origin + 12) % 8 - 4;
  return VIEW_DIRECTIONS[(origin + Math.sign(distance) * Math.min(Math.abs(distance), maximumSteps) + 8) % 8];
}
export function tableRoute(from, to, lane = 0) {
  const start = from.slice(); const finish = to.slice();
  const sameRow = (from[1] < 220) === (to[1] < 220);
  if (sameRow) {
    const outerY = from[1] < 220 ? 112 - lane * 12 : 377 + lane * 12;
    return [start, [from[0], outerY], [to[0], outerY], finish];
  }
  const side = (from[0] + to[0]) / 2 < 210 ? 61 + lane * 6 : 359 - lane * 6;
  return [start, [side, from[1] < 220 ? 112 : 377], [side, to[1] < 220 ? 112 : 377], finish];
}

export function createDirectionalArt(guestElements) {
  const fronts = {};
  for (const [character, element] of Object.entries(guestElements)) {
    const original = element.querySelector("svg");
    const head = original.querySelector(".head").outerHTML;
    const body = original.querySelector(".breath").cloneNode(true);
    body.querySelector(".head").remove();
    const bank = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    bank.classList.add("direction-defs"); bank.setAttribute("aria-hidden", "true");
    bank.appendChild(original.querySelector("defs").cloneNode(true));
    original.querySelector("defs").remove();
    document.body.appendChild(bank);
    fronts[character] = { head, body: body.innerHTML };
  }
  const mirror = (markup, direction) => ["SW", "W", "NW"].includes(direction) ? '<g transform="translate(140 0) scale(-1 1)">' + markup + '</g>' : markup;
  const profile = direction => direction === "N" ? "back" : ["NE", "NW"].includes(direction) ? "rear" : ["E", "W"].includes(direction) ? "side" : "quarter";
  function headArt(character, direction) {
    if (direction === "S") return fronts[character].head;
    const view = profile(direction);
    const fox = character === "fox";
    const fur = fox ? "#de9256" : "#f1e2c9";
    const stroke = fox ? "#b77144" : "#c5b08e";
    const fill = 'fill="url(#' + character + '-fur)" stroke="' + stroke + '" stroke-width="1.5"';
    const ear = fox
      ? '<g class="ear ear-left"><path d="M39 53 30 13q22 3 31 25Z" fill="' + fur + '" stroke="' + stroke + '"/><path d="m38 24 13 18-12 2Z" fill="' + (view === "back" || view === "rear" ? "#c7804b" : "#775143") + '"/></g><g class="ear ear-right"><path d="M80 42 101 15q12 16 7 43Z" fill="' + fur + '" stroke="' + stroke + '"/><path d="m99 27-11 19 13 3Z" fill="' + (view === "back" ? "#c7804b" : "#775143") + '"/></g>'
      : '<g class="ear ear-left"><path d="M47 56C25 16 38-8 47 7c10 17 12 32 11 47Z" fill="' + fur + '" stroke="' + stroke + '"/>' + (view === "back" || view === "rear" ? '' : '<path d="M47 44C36 17 41 6 45 17l7 28Z" fill="#dfb0a0"/>') + '</g><g class="ear ear-right"><path d="M79 54C77 17 94-7 102 7c7 13-5 39-12 50Z" fill="' + fur + '" stroke="' + stroke + '"/>' + (view === "back" ? '' : '<path d="M86 43c1-19 10-35 11-23l-7 25Z" fill="#dfb0a0"/>') + '</g>';
    let face;
    if (view === "back") {
      face = '<path d="M34 55q13-23 37-21 29-1 40 24l7 18-7 13q-13 18-41 17-31-2-40-22l-6-10Z" ' + fill + '/><path d="M46 87q24 21 48 0" fill="none" stroke="' + (fox ? '#edb17b' : '#fff2d8') + '" stroke-width="3"/><path d="m62 40 8-5 9 6" fill="none" stroke="' + (fox ? '#efad73' : '#fff3dc') + '" stroke-width="2"/>';
    } else if (view === "rear") {
      face = '<path d="M32 57q11-25 40-23 26 1 37 24l9 16-10 17q-22 19-54 11-24-8-24-28Z" ' + fill + '/><path d="M102 72q18 2 18 10l-16 11" fill="' + (fox ? '#f2dab2' : '#f8ead2') + '" stroke="' + stroke + '"/><path d="M38 83q20 20 46 15" fill="none" stroke="' + (fox ? '#edb17b' : '#fff2dc') + '" stroke-width="3"/><path d="M104 65v5" stroke="#4b3e32" stroke-width="2.5" stroke-linecap="round"/><circle cx="119" cy="81" r="2.5" fill="' + (fox ? '#4b3d31' : '#bd8a7b') + '"/>';
    } else if (view === "side") {
      face = '<path d="M39 50q22-25 48-9 15 9 16 26l' + (fox ? '23 14-22 16' : '12 11-13 18') + 'q-17 15-41 6-30-6-29-30Z" ' + fill + '/><path d="M85 76q' + (fox ? '21 0 38 6l-23 15q-12 9-28-2' : '20-6 28 5l-12 16q-13 7-23-3') + 'Z" fill="' + (fox ? '#f6e4bf' : '#faecd4') + '"/><g class="eyes-open"><ellipse cx="93" cy="66" rx="4.2" ry="6" fill="#4b3e32"/><circle cx="94" cy="64" r="1.4" fill="#fff4db"/></g><g class="eyes-happy"><path d="M89 67q4-5 8 0" fill="none" stroke="#4b3e32" stroke-width="2"/></g><path class="brows" d="m87 55 11 3" stroke="' + stroke + '" stroke-width="2"/><circle cx="' + (fox ? '124' : '113') + '" cy="81" r="3.2" fill="' + (fox ? '#4b3d31' : '#bd8a7b') + '"/><path d="M104 92q6 2 10-2" fill="none" stroke="' + stroke + '" stroke-width="1.5"/><ellipse cx="87" cy="83" rx="6" ry="3" fill="#d79478" opacity=".3"/>';
    } else {
      face = '<path d="M31 51q15-24 42-21 29 0 39 24l9 18-12 20q-18 20-49 10-29-5-33-26Z" ' + fill + '/><path d="M39 73q17 1 41 13 20-14 36-10-10 23-34 28-29-2-43-31Z" fill="' + (fox ? '#f9e7c3' : '#faecd4') + '"/><g class="eyes-open"><ellipse cx="59" cy="65" rx="6" ry="7" fill="#463c31"/><ellipse cx="99" cy="65" rx="4" ry="6" fill="#463c31"/><circle cx="61" cy="63" r="1.7" fill="#fff7df"/><circle cx="100" cy="63" r="1.4" fill="#fff7df"/></g><g class="eyes-happy"><path d="M53 67q6-7 12 0m30 0q4-5 8 0" fill="none" stroke="#514335" stroke-width="2"/></g><g class="brows" stroke="' + stroke + '" stroke-width="2"><path d="m52 54 13-1m31 1 8 2"/></g><path d="m80 80 12 1-6 6Z" fill="' + (fox ? '#4b3d31' : '#bd8a7b') + '"/><path d="M86 86v5m0 0q-5 4-9 0m9 0q5 3 9-1" fill="none" stroke="' + stroke + '" stroke-width="1.5"/><ellipse cx="47" cy="80" rx="7" ry="4" fill="#d79478" opacity=".3"/>';
    }
    return '<g class="head">' + mirror(ear + face, direction) + '</g>';
  }
  function bodyArt(character, direction) {
    if (direction === "S") return fronts[character].body;
    const fox = character === "fox";
    const view = profile(direction);
    const rear = view === "back" || view === "rear";
    const outline = fox ? "#b87948" : "#c7b391";
    const torso = '<ellipse cx="70" cy="120" rx="' + (view === "side" ? 24 : 30) + '" ry="29" fill="url(#' + character + '-fur)" stroke="' + outline + '" stroke-width="1.4"/>';
    const feet = '<g class="feet"><ellipse cx="55" cy="146" rx="16" ry="6" fill="' + (fox ? '#694c39' : '#f0e0c4') + '"/><ellipse cx="85" cy="146" rx="16" ry="6" fill="' + (fox ? '#694c39' : '#f0e0c4') + '"/></g>';
    const paws = '<g class="paw paw-left"><path d="M45 111q-8 18 0 21l8-4" fill="' + (fox ? '#df9960' : '#f9ecd5') + '" stroke="' + outline + '"/></g><g class="paw paw-right"><path d="M91 111q13 12 5 20l-10-6" fill="' + (fox ? '#df9960' : '#f9ecd5') + '" stroke="' + outline + '"/></g>';
    const tail = fox ? '<g class="tail"><path d="M70 137q-31 13-35-15-2-13-12-21-4 38 17 48 22 10 36-5Z" fill="#cb7e45" stroke="#b87543"/><path d="M35 122q-2-13-12-21-2 19 2 31Z" fill="#f8e7c7"/></g>' : '<g class="tail"><circle cx="' + (rear ? '72' : '45') + '" cy="135" r="12" fill="#fff1d8" stroke="#d7c3a2"/><path d="m67 131 5-3 5 4" fill="none" stroke="#fffaf0" stroke-width="2"/></g>';
    const bib = rear ? '' : '<path d="M59 111q11 5 22-2l-3 23q-12 7-19-4Z" fill="' + (fox ? '#f6e1b9' : '#fff2db') + '"/>';
    const scarf = '<path d="M45 99q26 10 49 0l-2 10q-24 8-45-1Z" fill="' + (fox ? '#aa533f' : '#819980') + '"/>' + (rear ? '<path d="M78 105l12 1-2 23-12-4Z" fill="' + (fox ? '#bc674a' : '#92aa8b') + '"/><path d="m78 121 10 3" stroke="' + (fox ? '#e8a681' : '#cfdbb5') + '" stroke-width="2"/>' : '<path d="M66 108 78 125 86 109" fill="' + (fox ? '#bc674a' : '#a7ba99') + '"/>');
    return mirror((rear ? '' : tail) + feet + torso + bib + paws, direction) + scarf + (rear ? mirror(tail, direction) : '');
  }
  function svg(character, bodyDirection, headDirection = bodyDirection) {
    if (!VIEW_DIRECTIONS.includes(bodyDirection) || !VIEW_DIRECTIONS.includes(headDirection)) throw new Error("Unknown direction");
    return '<svg viewBox="0 0 140 160" role="img" aria-label="' + character + ' ' + VIEW_LABELS[bodyDirection] + '" data-art-direction="' + bodyDirection + '" data-head-direction="' + headDirection + '"><ellipse class="ground-shadow" cx="70" cy="148" rx="34" ry="7" fill="#75452e" opacity=".14"/><g class="breath"><g class="body-view">' + bodyArt(character, bodyDirection) + '</g>' + headArt(character, headDirection) + '</g></svg>';
  }
  function paint(element, character, bodyDirection, headDirection = bodyDirection) {
    const key = bodyDirection + ":" + headDirection;
    if (element.dataset.viewKey === key) return;
    element.querySelector("svg")?.remove();
    element.insertAdjacentHTML("afterbegin", svg(character, bodyDirection, headDirection));
    element.dataset.viewKey = key;
    element.dataset.facing = bodyDirection;
    element.dataset.gaze = headDirection;
  }
  return { paint, svg };
}
