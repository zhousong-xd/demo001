import { createWarmTable, WARM_LEVEL } from "./model.mjs";
import { createDirectionalArt, seatFacing, vectorFacing, gazeFacing, tableRoute, VIEW_DIRECTIONS, VIEW_LABELS } from "./directions.mjs";

const warmStore = createWarmTable();
const stage = document.getElementById("stage");
const guests = Object.fromEntries(WARM_LEVEL.characters.map(character => [character, document.getElementById(character)]));
const directionArt = createDirectionalArt(guests);
const seatButtons = [...document.querySelectorAll(".seat")];
const warmCoordinates = { A1: [112, 165], A2: [308, 165], B1: [112, 341], B2: [308, 341] };
const waitingCoordinates = { fox: [155, 429], rabbit: [265, 429] };
const guestNames = { fox: "阿狐", rabbit: "小兔" };
const warmTimers = new Set();
const warmAnimations = new Set();
const reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = reducedQuery.matches;
let manualMotion = false;
let selectedGuest = null;
let bellMode = false;
let pointerGesture = null;
let suppressClickUntil = 0;
let previewSeat = null;
let hoverTimer = null;
let soundOn = false;
let audioContext = null;
let dismissedFeast = false;
const lookOverrides = {};
const transitGuests = new Set();
const tableOccluder = document.querySelector(".room").cloneNode(true);
tableOccluder.querySelector("defs")?.remove();
tableOccluder.querySelectorAll("[id]").forEach(element => element.removeAttribute("id"));
tableOccluder.classList.add("table-occluder");
stage.appendChild(tableOccluder);

function later(action, delay) {
  const timer = setTimeout(() => { warmTimers.delete(timer); action(); }, delay);
  warmTimers.add(timer);
  return timer;
}
function cleanPresentation() {
  warmTimers.forEach(clearTimeout);
  warmTimers.clear();
  warmAnimations.forEach(animation => animation.cancel());
  warmAnimations.clear();
  transitGuests.clear();
  Object.keys(lookOverrides).forEach(character => delete lookOverrides[character]);
  Object.values(guests).forEach(guest => guest.classList.remove("in-transit"));
  Object.values(guests).forEach(guest => guest.classList.remove("noticing"));
  Object.values(guests).forEach(guest => guest.classList.remove("hop", "react"));
  document.getElementById("fx").replaceChildren();
  document.getElementById("speech").classList.remove("visible");
}
function sound(kind) {
  if (!soundOn) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().catch(() => {});
    const pitches = kind === "bell" ? [880, 1320] : kind === "win" ? [523.25, 659.25, 783.99] : kind === "reject" ? [180] : [330];
    for (const [index, pitch] of pitches.entries()) {
      const oscillator = audioContext.createOscillator();
      const volume = audioContext.createGain();
      const start = audioContext.currentTime + index * .065;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(pitch, start);
      volume.gain.setValueAtTime(.0001, start);
      volume.gain.exponentialRampToValueAtTime(.055, start + .012);
      volume.gain.exponentialRampToValueAtTime(.0001, start + .3);
      oscillator.connect(volume).connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + .32);
      oscillator.onended = () => { oscillator.disconnect(); volume.disconnect(); };
    }
  } catch { soundOn = false; updateSettings(); }
}
function currentPosition(character) {
  return warmCoordinates[warmStore.read().assignment[character]] || waitingCoordinates[character];
}
function setStatus(text, state = "PENDING") {
  document.getElementById("status-text").textContent = text;
  document.getElementById("status-strip").dataset.state = state;
  document.getElementById("status-icon").textContent = state === "SATISFIED" ? "✓" : state === "CONFLICT" ? "!" : "·";
}
function say(text) {
  const speech = document.getElementById("speech");
  speech.textContent = text;
  speech.classList.add("visible");
  later(() => speech.classList.remove("visible"), 1700);
}
function ruleStatus(state, id) { return state.result.rules.find(rule => rule.id === id)?.status || "PENDING"; }
function setGuestView(character, targetDirection = null) {
  const state = warmStore.read();
  const body = seatFacing(state.assignment[character]);
  const target = targetDirection || lookOverrides[character];
  let head = target ? gazeFacing(body, target, lookOverrides[character] ? 2 : 1) : body;
  if (!target && character === "rabbit" && ruleStatus(state, "eye-contact") === "CONFLICT") head = body === "N" ? "NE" : "SW";
  if (!target && selectedGuest === character) head = body === "N" ? "NE" : "SE";
  directionArt.paint(guests[character], character, body, head);
}
function relationshipBeat(character, usedBell = false) {
  if (reducedMotion) return;
  const state = warmStore.read();
  const other = character === "fox" ? "rabbit" : "fox";
  if (!state.assignment[character] || !state.assignment[other]) return;
  const point = currentPosition(character);
  const target = currentPosition(other);
  lookOverrides[character] = usedBell ? "E" : vectorFacing(target[0] - point[0], target[1] - point[1]);
  setGuestView(character);
  guests[character].classList.add("noticing");
  later(() => {
    guests[character].classList.remove("noticing");
    delete lookOverrides[character];
    setGuestView(character);
    lookOverrides[other] = vectorFacing(point[0] - target[0], point[1] - target[1]);
    setGuestView(other);
  }, usedBell ? 520 : 360);
  later(() => { delete lookOverrides[other]; setGuestView(other); }, usedBell ? 900 : 720);
}
function render() {
  const state = warmStore.read();
  const relationStatus = ruleStatus(state, "eye-contact");
  stage.dataset.selected = String(!!selectedGuest);
  for (const [character, element] of Object.entries(guests)) {
    const point = currentPosition(character);
    element.style.setProperty("--x", point[0] / 420 * 100 + "%");
    element.style.setProperty("--y", point[1] / 440 * 100 + "%");
    element.classList.toggle("waiting-guest", state.assignment[character] === null);
    element.dataset.row = state.assignment[character]?.[0] || "waiting";
    if (!transitGuests.has(character)) setGuestView(character);
    element.classList.toggle("selected", selectedGuest === character);
    element.classList.toggle("calm", state.calm.includes(character));
    element.setAttribute("aria-pressed", String(selectedGuest === character));
    element.setAttribute("aria-label", guestNames[character] + "，" + (state.assignment[character] || "候客区") + (state.calm.includes(character) ? "，已安心" : "") + "，点选或拖动");
    element.dataset.mood = state.calm.includes(character) ? "calm" : selectedGuest === character ? "expectant" : relationStatus === "CONFLICT" ? "uneasy" : state.won ? "happy" : "neutral";
  }
  for (const seat of seatButtons) {
    const occupant = WARM_LEVEL.characters.find(character => state.assignment[character] === seat.dataset.seat);
    seat.dataset.occupied = String(!!occupant);
    seat.setAttribute("aria-label", seat.dataset.seat + (seat.dataset.seat === "A1" ? " 窗边座" : " 座位") + (occupant ? "，" + guestNames[occupant] + "已入座" : "，空座") + (selectedGuest ? "，放置选中客人" : ""));
    if (selectedGuest && state.assignment[selectedGuest] === seat.dataset.seat) seat.dataset.origin = "true";
    else delete seat.dataset.origin;
  }
  for (const rule of state.result.rules) {
    const element = document.getElementById("rule-" + rule.id);
    element.dataset.state = rule.status;
    element.querySelector(".rule-symbol").textContent = rule.status === "SATISFIED" ? "✓" : rule.status === "CONFLICT" ? "!" : "·";
  }
  const foxPoint = currentPosition("fox");
  const rabbitPoint = currentPosition("rabbit");
  const line = document.getElementById("relation-path");
  const sign = document.getElementById("relation-sign");
  const showRelation = relationStatus === "CONFLICT";
  line.style.display = sign.style.display = showRelation ? "" : "none";
  line.setAttribute("d", "M" + foxPoint[0] + " " + (foxPoint[1] - 10) + "L" + rabbitPoint[0] + " " + (rabbitPoint[1] - 65));
  sign.setAttribute("transform", "translate(" + (foxPoint[0] + rabbitPoint[0]) / 2 + " " + ((foxPoint[1] + rabbitPoint[1]) / 2 - 32) + ")");
  document.getElementById("undo").disabled = state.historyLength === 0;
  document.getElementById("stock").textContent = state.inventory.calm_bell;
  const bell = document.getElementById("bell");
  bell.setAttribute("aria-pressed", String(bellMode));
  bell.dataset.empty = String(state.inventory.calm_bell === 0);
  bell.querySelector("small").textContent = bellMode ? "现在点一下小兔" : state.inventory.calm_bell === 0 ? "已使用 · 撤销可恢复" : "让兔放下戒心";
  document.getElementById("move-count").textContent = state.moves ? state.moves + " 次小安排" : "尚未换座";
  document.getElementById("feast").hidden = !state.won || dismissedFeast;
  if (bellMode) setStatus("铃准备好了。点小兔；点狐狸不会消耗。", "PENDING");
  else if (selectedGuest) setStatus("已选" + guestNames[selectedGuest] + "：点座位可放下，点另一位可交换。", "PENDING");
  else if (state.won) setStatus(state.calm.includes("rabbit") ? "安心了，对坐也没关系。可以开席。" : "避开了对视，这一桌刚刚好。", "SATISFIED");
  else if (ruleStatus(state, "window") === "CONFLICT") setStatus("阿狐想坐窗边 A1，给它留个好位置吧。", "CONFLICT");
  else if (relationStatus === "CONFLICT") setStatus("小兔有点紧张，不想和阿狐面对面。", "CONFLICT");
  else setStatus("还有客人在候客区，请它入座吧。", "PENDING");
}
function clearPreview() {
  if (hoverTimer) { clearTimeout(hoverTimer); warmTimers.delete(hoverTimer); hoverTimer = null; }
  previewSeat = null;
  seatButtons.forEach(seat => { delete seat.dataset.preview; seat.querySelector(".seat-dot").textContent = seat.dataset.seat === "A1" ? "✦" : "＋"; });
  document.getElementById("preview-path").setAttribute("d", "");
  document.getElementById("waiting").classList.remove("target");
}
function previewAt(seatId) {
  if (previewSeat === seatId) return;
  clearPreview();
  if (!selectedGuest) return;
  previewSeat = seatId;
  if (seatId === "waiting") {
    document.getElementById("waiting").classList.add("target");
    setStatus("放下后回到候客长凳，不会丢失安心状态。");
    return;
  }
  const preview = warmStore.preview(selectedGuest, seatId);
  if (!preview) return;
  const status = preview.result.rules.some(rule => rule.status === "CONFLICT") ? "CONFLICT" : preview.won ? "SATISFIED" : "PENDING";
  const seat = seatButtons.find(button => button.dataset.seat === seatId);
  seat.dataset.preview = status;
  seat.querySelector(".seat-dot").textContent = preview.kind === "swap" ? "⇄" : preview.kind === "displace" ? "↗" : "↓";
  const origin = currentPosition(selectedGuest);
  const target = warmCoordinates[seatId];
  document.getElementById("preview-path").setAttribute("d", "M" + origin[0] + " " + origin[1] + "Q210 217 " + target[0] + " " + target[1]);
  const action = preview.kind === "swap" ? "交换座位" : preview.kind === "displace" ? "原客人回候客区" : "可以放下";
  setStatus(action + (status === "CONFLICT" ? " · 可放，但仍有规则未满足" : preview.won ? " · 这样就能开席" : " · 还有客人没入座"), status === "SATISFIED" ? status : "PENDING");
  const actor = selectedGuest;
  hoverTimer = later(() => {
    if (selectedGuest !== actor) return;
    guests[actor].dataset.mood = status === "CONFLICT" ? "uneasy" : "expectant";
    setGuestView(actor, vectorFacing(target[0] - origin[0], target[1] - origin[1]));
  }, 150);
}
function animatePlacement(before, beforeState, lifted = false) {
  if (reducedMotion) return;
  let routeLane = 0;
  for (const [character, element] of Object.entries(guests)) {
    const after = element.getBoundingClientRect();
    const deltaX = before[character].left - after.left;
    const deltaY = before[character].top - after.top;
    if (Math.abs(deltaX) + Math.abs(deltaY) < 1) continue;
    const origin = warmCoordinates[beforeState.assignment[character]] || waitingCoordinates[character];
    const destination = currentPosition(character);
    const route = tableRoute(origin, destination, routeLane++);
    const stageBounds = stage.getBoundingClientRect();
    const duration = lifted ? 230 : 580;
    const transformAt = (offsetX, offsetY) => "translate(calc(-50% + " + offsetX + "px), calc(-100% + " + offsetY + "px))";
    const keyframes = lifted ? [
      { transform: transformAt(deltaX, deltaY) },
      { transform: transformAt(deltaX * .45, deltaY * .45 - 12), offset: .55 },
      { transform: transformAt(0, 0) }
    ] : route.map((point, index) => ({
      transform: transformAt((point[0] - destination[0]) / 420 * stageBounds.width, (point[1] - destination[1]) / 440 * stageBounds.height),
      offset: index / (route.length - 1)
    }));
    transitGuests.add(character);
    element.classList.add("in-transit");
    if (!lifted) {
      for (let index = 0; index < route.length - 1; index++) {
        const face = vectorFacing(route[index + 1][0] - route[index][0], route[index + 1][1] - route[index][1]);
        const turn = () => directionArt.paint(element, character, face, face);
        if (index === 0) turn(); else later(turn, index / (route.length - 1) * duration);
      }
    }
    const animation = element.animate(keyframes, { duration, easing: "linear" });
    warmAnimations.add(animation);
    animation.onfinish = () => {
      warmAnimations.delete(animation);
      transitGuests.delete(character);
      element.classList.remove("in-transit");
      setGuestView(character);
      element.classList.add("hop");
    };
  }
}
function effect(character, kind) {
  if (reducedMotion) return;
  const point = currentPosition(character);
  const container = document.getElementById("fx");
  for (let index = 0; index < (kind === "bell" ? 2 : 1); index++) {
    const element = document.createElement("span");
    element.className = kind === "bell" ? "ripple" + (index ? " second" : "") : "spark";
    element.style.setProperty("--x", point[0] / 420 * 100 + "%");
    element.style.setProperty("--y", (point[1] - 75) / 440 * 100 + "%");
    if (kind !== "bell") element.textContent = "✧";
    container.appendChild(element);
    later(() => element.remove(), 1000);
  }
}
function act(kind, character, seat, lifted = false, liftedBounds = null) {
  cancelGesture(false);
  clearPreview();
  cleanPresentation();
  const beforeState = warmStore.read();
  const before = Object.fromEntries(Object.entries(guests).map(([name, element]) => [name, element.getBoundingClientRect()]));
  if (liftedBounds) before[character] = liftedBounds;
  const result = kind === "bell" ? warmStore.bell(character) : kind === "waiting" ? warmStore.wait(character) : warmStore.move(character, seat);
  selectedGuest = null;
  bellMode = false;
  const afterState = warmStore.read();
  if (!afterState.won || !beforeState.won) dismissedFeast = false;
  render();
  if (result.changed) {
    animatePlacement(before, beforeState, lifted);
    if (kind === "bell") relationshipBeat(character, true);
    else later(() => relationshipBeat(character), reducedMotion ? 0 : lifted ? 250 : 610);
    if (kind === "bell") { effect(character, "bell"); say("小兔：呼……好像没那么紧张了。"); sound("bell"); }
    else {
      const reaction = afterState.result.rules.some(rule => rule.status === "CONFLICT") ? "阿狐：先坐下，慢慢商量。" : "这样坐，舒服多了。";
      say(result.kind === "swap" ? "借过一下，我们换个座。" : result.kind === "displace" ? "被换下的客人回长凳等一等。" : result.kind === "waiting" ? "先在长凳歇一会儿。" : reaction);
      guests[character].classList.add("react");
      sound("seat");
    }
    if (!beforeState.won && afterState.won) { effect("rabbit", "win"); later(() => sound("win"), 180); }
  } else if (kind === "bell") {
    const text = result.reason === "invalid-target" ? "铃只对小兔有效，这次没有消耗。" : result.reason === "already-calm" ? "小兔已经安心，不会重复消耗。" : "安心铃已用完，可以撤销或重玩。";
    setStatus(text, "PENDING"); say(text); sound("reject");
  }
}
function selectGuest(character) {
  if (performance.now() < suppressClickUntil) return;
  if (bellMode) { act("bell", character); return; }
  const state = warmStore.read();
  if (selectedGuest && selectedGuest !== character && state.assignment[character]) { act("move", selectedGuest, state.assignment[character]); return; }
  clearPreview(); cleanPresentation();
  selectedGuest = selectedGuest === character ? null : character;
  render();
  if (selectedGuest) sound("pick");
}
function pointerTarget(clientX, clientY) {
  const bounds = stage.getBoundingClientRect();
  const stageX = (clientX - bounds.left) / bounds.width * 420;
  const stageY = (clientY - bounds.top) / bounds.height * 440;
  if (stageX < 0 || stageX > 420 || stageY < 0 || stageY > 440) return null;
  if (stageY >= 386 && stageX >= 65 && stageX <= 355) return "waiting";
  let nearest = null;
  let best = 76;
  for (const [seatId, point] of Object.entries(warmCoordinates)) {
    const distance = Math.hypot(stageX - point[0], (stageY - (point[1] - 20)) * .8);
    if (distance < best) { best = distance; nearest = seatId; }
  }
  return nearest;
}
function cancelGesture(suppress = true) {
  const active = pointerGesture;
  pointerGesture = null;
  if (!active) return;
  active.ghost?.remove();
  active.element.classList.remove("drag-source");
  if (active.element.hasPointerCapture?.(active.pointerId)) active.element.releasePointerCapture(active.pointerId);
  if (suppress) suppressClickUntil = performance.now() + 400;
}
function cancelInteraction() { cancelGesture(); clearPreview(); cleanPresentation(); selectedGuest = null; bellMode = false; render(); }
for (const [character, element] of Object.entries(guests)) {
  element.addEventListener("click", () => selectGuest(character));
  element.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0 || bellMode || pointerGesture) return;
    pointerGesture = { pointerId: event.pointerId, character, element, startX: event.clientX, startY: event.clientY, moved: false, ghost: null };
    element.setPointerCapture(event.pointerId);
  });
  element.addEventListener("lostpointercapture", event => { if (pointerGesture?.pointerId === event.pointerId) cancelInteraction(); });
}
document.addEventListener("pointerdown", event => { if (pointerGesture && event.pointerId !== pointerGesture.pointerId) cancelInteraction(); }, true);
window.addEventListener("pointermove", event => {
  const active = pointerGesture;
  if (!active || active.pointerId !== event.pointerId) return;
  if (!active.moved && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 7) return;
  event.preventDefault();
  if (!active.moved) {
    active.moved = true;
    cleanPresentation(); selectedGuest = active.character; clearPreview(); render();
    const ghost = document.createElement("div");
    ghost.className = active.element.className + " drag-ghost";
    ghost.dataset.mood = "expectant";
    const illustration = active.element.querySelector("svg").cloneNode(true);
    illustration.querySelector("defs")?.remove();
    ghost.appendChild(illustration);
    ghost.style.width = active.element.getBoundingClientRect().width + "px";
    document.body.appendChild(ghost);
    active.ghost = ghost;
    active.element.classList.add("drag-source");
  }
  active.ghost.style.left = event.clientX + "px";
  active.ghost.style.top = event.clientY + "px";
  const target = pointerTarget(event.clientX, event.clientY);
  if (target) previewAt(target);
  else { clearPreview(); setStatus("拖回座位或候客区；松在桌外则取消。"); }
}, { passive: false });
window.addEventListener("pointerup", event => {
  const active = pointerGesture;
  if (!active || active.pointerId !== event.pointerId) return;
  const target = active.moved ? pointerTarget(event.clientX, event.clientY) : null;
  const moved = active.moved;
  const liftedBounds = active.ghost?.getBoundingClientRect();
  cancelGesture(moved);
  if (!moved) return;
  clearPreview();
  if (target) act(target === "waiting" ? "waiting" : "move", active.character, target, true, liftedBounds);
  else { selectedGuest = null; render(); say("没放到座位上，回到原位。 "); }
});
window.addEventListener("pointercancel", event => { if (pointerGesture?.pointerId === event.pointerId) cancelInteraction(); });
for (const seat of seatButtons) {
  seat.addEventListener("click", () => { if (selectedGuest && performance.now() >= suppressClickUntil) act("move", selectedGuest, seat.dataset.seat); });
  seat.addEventListener("pointerenter", () => { if (selectedGuest && !pointerGesture && !bellMode) previewAt(seat.dataset.seat); });
  seat.addEventListener("pointerleave", () => { if (!pointerGesture) { clearPreview(); render(); } });
  seat.addEventListener("focus", () => { if (selectedGuest) previewAt(seat.dataset.seat); });
  seat.addEventListener("blur", () => { if (!pointerGesture) { clearPreview(); render(); } });
}
document.getElementById("waiting").addEventListener("click", () => { if (selectedGuest && performance.now() >= suppressClickUntil) act("waiting", selectedGuest); });
document.getElementById("bell").addEventListener("click", () => { cancelGesture(); clearPreview(); cleanPresentation(); selectedGuest = null; bellMode = !bellMode; render(); });
document.getElementById("undo").addEventListener("click", () => { cancelInteraction(); const beforeState = warmStore.read(); const before = Object.fromEntries(Object.entries(guests).map(([name, element]) => [name, element.getBoundingClientRect()])); warmStore.undo(); dismissedFeast = false; render(); animatePlacement(before, beforeState, true); say("刚才的安排，已经一起撤回。"); });
document.getElementById("restart").addEventListener("click", () => { cancelInteraction(); warmStore.reset(); dismissedFeast = false; render(); say("重新开桌，安心铃也回来了。"); });
document.getElementById("dismiss-feast").addEventListener("click", () => { dismissedFeast = true; render(); });
function updateSettings() {
  document.body.classList.toggle("reduce-motion", reducedMotion);
  document.getElementById("motion").setAttribute("aria-pressed", String(reducedMotion));
  document.getElementById("motion").setAttribute("aria-label", reducedMotion ? "恢复动画" : "减少动画");
  document.getElementById("sound").setAttribute("aria-pressed", String(soundOn));
  document.getElementById("sound").setAttribute("aria-label", soundOn ? "关闭声音" : "开启声音");
}
document.getElementById("motion").addEventListener("click", () => { manualMotion = true; reducedMotion = !reducedMotion; cancelInteraction(); updateSettings(); });
reducedQuery.addEventListener("change", event => { if (!manualMotion) { reducedMotion = event.matches; cancelInteraction(); updateSettings(); } });
document.getElementById("sound").addEventListener("click", () => { soundOn = !soundOn; if (!soundOn) audioContext?.suspend().catch(() => {}); updateSettings(); sound("bell"); });
const help = document.getElementById("help");
const directionDialog = document.getElementById("direction-dialog");
let inspectDirection = "S";
let inspectHead = "S";
function renderInspector() {
  const character = document.getElementById("inspect-character").value;
  const mood = document.getElementById("inspect-mood").value;
  const hero = document.getElementById("inspect-hero");
  hero.className = "guest " + character;
  hero.dataset.mood = mood;
  hero.innerHTML = directionArt.svg(character, inspectDirection, inspectHead);
  document.getElementById("inspect-label").textContent = VIEW_LABELS[inspectDirection] + " · " + inspectDirection + (inspectHead !== inspectDirection ? " / 头朝" + VIEW_LABELS[inspectHead] : "");
  const grid = document.getElementById("direction-grid");
  grid.replaceChildren();
  for (const direction of VIEW_DIRECTIONS) {
    const button = document.createElement("button");
    button.className = "view-tile " + character;
    button.dataset.direction = direction;
    button.dataset.mood = mood;
    button.setAttribute("aria-label", VIEW_LABELS[direction]);
    button.setAttribute("aria-pressed", String(direction === inspectDirection));
    button.innerHTML = directionArt.svg(character, direction) + '<span>' + VIEW_LABELS[direction] + '</span>';
    button.addEventListener("click", () => { inspectDirection = direction; inspectHead = direction; renderInspector(); });
    grid.appendChild(button);
  }
}
document.getElementById("open-directions").addEventListener("click", () => { cancelInteraction(); renderInspector(); directionDialog.showModal(); });
document.getElementById("close-directions").addEventListener("click", () => directionDialog.close());
for (const id of ["inspect-character", "inspect-mood"]) document.getElementById(id).addEventListener("change", renderInspector);
for (const [id, offset] of [["look-left", 1], ["look-center", 0], ["look-right", -1]]) document.getElementById(id).addEventListener("click", () => {
  inspectHead = VIEW_DIRECTIONS[(VIEW_DIRECTIONS.indexOf(inspectDirection) + offset + 8) % 8];
  renderInspector();
});
document.getElementById("info").addEventListener("click", () => { cancelInteraction(); help.showModal(); });
for (const id of ["close-help", "help-play"]) document.getElementById(id).addEventListener("click", () => help.close());
window.addEventListener("keydown", event => { if (event.key === "Escape") cancelInteraction(); });
window.addEventListener("blur", cancelInteraction);
window.addEventListener("resize", cancelInteraction);
window.addEventListener("pagehide", () => { cancelInteraction(); audioContext?.suspend().catch(() => {}); });
document.addEventListener("visibilitychange", () => { if (document.hidden) { cancelInteraction(); audioContext?.suspend().catch(() => {}); } });
Object.defineProperty(window, "__WARM_TABLE__", { value: Object.freeze({ snapshot: () => ({ ...warmStore.read(), selected: selectedGuest, bellMode, reducedMotion, soundOn, gestureActive: !!pointerGesture, ghostCount: document.querySelectorAll(".drag-ghost").length, activeAnimations: warmAnimations.size, directions: Object.fromEntries(Object.entries(guests).map(([character, guest]) => [character, { body: guest.dataset.facing, head: guest.dataset.gaze, row: guest.dataset.row, moving: transitGuests.has(character) }])) }) }), writable: false });
updateSettings(); render();
