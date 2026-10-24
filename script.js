/* Devlog Timer — the 10-hour cap, made visible. */
"use strict";

const $ = (s) => document.querySelector(s);
const KEY = "devlogtimer:v1";
const state = Object.assign(
  { running: false, sessionStart: null, sessionAccum: 0, day: "", dayMinutes: 0, week: "", weekMinutes: 0, devlogsToday: 0, ships: 0, votes: 0 },
  JSON.parse(localStorage.getItem(KEY) || "{}")
);

function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function today() { return new Date().toISOString().slice(0, 10); }
function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
if (state.day !== today()) { state.day = today(); state.dayMinutes = 0; state.devlogsToday = 0; save(); }
if (state.week !== weekStart()) { state.week = weekStart(); state.weekMinutes = 0; save(); }

const BASE_TITLE = document.title;

const CAP_MINUTES = 600; // 10h per devlog
const REMIND_EVERY = 120; // 2h of coding between devlog nudges

let timerId = null;
function elapsedMs() {
  return state.sessionAccum + (state.running && state.sessionStart ? Date.now() - state.sessionStart : 0);
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}
function fmtMin(m) { m = Math.round(m); return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }
function fmtTitle(ms) {
  const s = Math.floor(ms / 1000);
  const p = (n) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  return h > 0 ? `${h}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}` : `${p(Math.floor(s / 60))}:${p(s % 60)}`;
}

function render() {
  const ms = elapsedMs();
  $("#clock").textContent = fmt(ms);
  document.title = state.running ? `${fmtTitle(ms)} · Devlog Timer` : BASE_TITLE;
  const sessionMin = ms / 60000;
  $("#bar").style.width = Math.min((sessionMin / CAP_MINUTES) * 100, 100) + "%";
  const phase = $("#phase");
  const sinceNudge = sessionMin % REMIND_EVERY;
  if (!state.running && sessionMin === 0) { phase.textContent = "ready — press start when you start coding"; phase.className = "phase"; }
  else if (sessionMin >= CAP_MINUTES) { phase.textContent = "over the cap — post a devlog now, extra time is lost"; phase.className = "phase warn"; }
  else if (sinceNudge < 1 && sessionMin > 5) { phase.textContent = "devlog window open — post one while it counts"; phase.className = "phase warn"; }
  else { phase.textContent = `next devlog nudge in ${fmtMin(REMIND_EVERY - sinceNudge)} · cap at ${fmtMin(CAP_MINUTES - sessionMin)} left`; phase.className = "phase"; }

  $("#todayTotal").textContent = fmtMin(Math.round(state.dayMinutes + sessionMin));
  $("#weekTotal").textContent = fmtMin(Math.round(state.weekMinutes + sessionMin));
  $("#todayDevlogs").textContent = state.devlogsToday;
  const banked = Math.max(0, CAP_MINUTES - sessionMin);
  $("#safeHours").textContent = `${fmtMin(Math.round(banked))} of this session still counts under the cap`;
  $("#balance").textContent = state.votes - state.ships * 18;
  $("#ships").textContent = state.ships;
  $("#startBtn").disabled = state.running;
  $("#stopBtn").disabled = !state.running;
}

$("#startBtn").addEventListener("click", () => {
  if (state.running) return;
  state.running = true; state.sessionStart = Date.now(); save(); render();
  timerId = setInterval(render, 1000);
});
$("#stopBtn").addEventListener("click", () => {
  if (!state.running) return;
  state.sessionAccum = elapsedMs(); state.running = false; state.sessionStart = null;
  state.dayMinutes += state.sessionAccum / 60000; state.weekMinutes += state.sessionAccum / 60000; state.sessionAccum = 0;
  save(); clearInterval(timerId); render();
});
$("#resetBtn").addEventListener("click", () => {
  clearInterval(timerId);
  state.running = false; state.sessionStart = null; state.sessionAccum = 0; save(); render();
});
$("#devlogBtn").addEventListener("click", () => {
  state.devlogsToday += 1;
  state.dayMinutes = Math.max(0, state.dayMinutes - CAP_MINUTES);
  save(); render();
});
$("#voteBtn").addEventListener("click", () => { state.votes += 1; save(); render(); });
$("#shipBtn").addEventListener("click", () => { state.ships += 1; save(); render(); });

$("#copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#template").textContent);
    $("#copied").textContent = "copied ✓";
    setTimeout(() => ($("#copied").textContent = ""), 1500);
  } catch { $("#copied").textContent = "select and copy manually"; }
});

document.addEventListener("visibilitychange", render);
render();
