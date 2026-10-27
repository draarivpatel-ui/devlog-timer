/* Devlog Timer — Stardance 10-Hour Cap Chronograph & Devlog Workbench */
"use strict";

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const KEY = "devlogtimer:v1";

const CAP_MINUTES = 600; // Hard 10h single-devlog cap
const REMIND_EVERY = 120; // 2h devlog checkpoint cadence
const WARN_AT_MS = 8 * 60 * 60 * 1000; // 8h red warning line
const DIAL_CIRCUMFERENCE = 653.45; // 2 * Math.PI * 104

const defaultState = {
  running: false,
  sessionStart: null,
  sessionAccum: 0,
  day: "",
  dayMinutes: 0,
  week: "",
  weekMinutes: 0,
  devlogsToday: 0,
  devlogLog: [],
  ships: 0,
  votes: 0,
  soundEnabled: true,
  pomoWorkMin: 25,
  pomoBreakMin: 5,
  pomoOffsetMs: 0,
  milestones: [],
  trickyNote: "",
  tryItUrl: "https://aariv.me/devlog-timer/"
};

const state = Object.assign({}, defaultState, JSON.parse(localStorage.getItem(KEY) || "{}"));

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function weekStart() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// Midnight rollover guard: banked under-cap minutes reset on a new day,
// but uncapped overflow above 600 minutes carries forward so it is never silently lost.
if (state.day !== today()) {
  const overflow = Math.max(0, (state.dayMinutes || 0) - CAP_MINUTES);
  state.day = today();
  state.dayMinutes = overflow;
  state.devlogsToday = 0;
  save();
}
if (state.week !== weekStart()) {
  state.week = weekStart();
  state.weekMinutes = 0;
  save();
}

// Web Audio API Synthesized Chimes (zero external audio files required)
let audioCtx = null;
function playChime(kind = "bell") {
  if (!state.soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === "suspended") audioCtx.resume();

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    if (kind === "click") {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.06);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (kind === "warn") {
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(330, now + 0.14);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.36);
    } else {
      // Harmonic C6 -> G6 bell chime
      osc.type = "sine";
      osc.frequency.setValueAtTime(1046.5, now);
      osc.frequency.setValueAtTime(1567.98, now + 0.11);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.65);
      osc.start(now);
      osc.stop(now + 0.66);
    }
  } catch {
    // Ignore audio context restrictions if not user-initiated
  }
}

const BASE_TITLE = document.title;
let timerId = null;
let lastChimeCheckpoint = 0;

function elapsedMs() {
  return state.sessionAccum + (state.running && state.sessionStart ? Date.now() - state.sessionStart : 0);
}

function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

function fmtMin(m) {
  m = Math.round(m);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function fmtMMSS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtTitle(ms) {
  const s = Math.floor(ms / 1000);
  const p = (n) => String(n).padStart(2, "0");
  const h = Math.floor(s / 3600);
  return h > 0 ? `${h}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}` : `${p(Math.floor(s / 60))}:${p(s % 60)}`;
}

function fmtWhen(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

let lastLogSig = null;
function renderLog() {
  const entries = state.devlogLog || [];
  const sig = entries.join("|");
  if (sig === lastLogSig) return;
  lastLogSig = sig;
  const ul = $("#devlogLog");
  ul.textContent = "";
  if (!entries.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No devlogs banked yet — your last 5 posts will appear here.";
    ul.appendChild(li);
    return;
  }
  for (const iso of entries) {
    const li = document.createElement("li");
    li.textContent = `✓ Posted devlog · ${fmtWhen(iso)}`;
    ul.appendChild(li);
  }
}

let lastMilestoneSig = null;
function renderMilestones() {
  const items = state.milestones || [];
  const sig = JSON.stringify(items);
  if (sig === lastMilestoneSig) return;
  lastMilestoneSig = sig;

  $("#milestoneCount").textContent = `${items.length} ${items.length === 1 ? "note" : "notes"} in session`;
  const list = $("#milestoneList");
  list.textContent = "";

  if (!items.length) {
    const li = document.createElement("li");
    li.className = "milestone-item dim";
    li.textContent = "No splits logged yet — press M to jot a timestamped commit note.";
    list.appendChild(li);
    return;
  }

  items.forEach((item, idx) => {
    const li = document.createElement("li");
    li.className = "milestone-item";

    const left = document.createElement("div");
    const meta = document.createElement("span");
    meta.className = "milestone-meta";
    meta.textContent = `[${item.at}] [${item.tag}] `;
    const txt = document.createElement("span");
    txt.textContent = item.text;
    left.appendChild(meta);
    left.appendChild(txt);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "milestone-del";
    delBtn.textContent = "×";
    delBtn.title = "Remove note";
    delBtn.addEventListener("click", () => {
      state.milestones.splice(idx, 1);
      save();
      render();
    });

    li.appendChild(left);
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

function compileMarkdown(sessionMin) {
  const items = state.milestones || [];
  const coveredTime = fmtMin(Math.max(1, Math.round(sessionMin || state.dayMinutes || 0)));
  const builtLines = items.length
    ? items.map((m) => `- **[${m.tag} @ ${m.at}]** ${m.text}`).join("\n")
    : "- Shipped core session updates and verified behavior locally.";

  const trickyText = (state.trickyNote || "").trim() ||
    "Keeping edge-case state transitions and responsive layout constraints clean without adding external dependencies.";
  const tryUrl = (state.tryItUrl || "").trim() || "https://aariv.me/devlog-timer/";

  const md = [
    `### What I built (${coveredTime} session)`,
    builtLines,
    "",
    "### What was tricky",
    trickyText,
    "",
    "### How to try it",
    `- Live / Repo: ${tryUrl}`,
    `- Session time covered: **${coveredTime}** (under the 10h Stardance cap)`
  ].join("\n");

  $("#template").textContent = md;
  const words = md.trim().split(/\s+/).filter(Boolean).length;
  $("#wordCountBadge").textContent = `${words} words · ${md.length} chars`;
}

function renderPomodoro(ms) {
  const workMs = (state.pomoWorkMin || 25) * 60 * 1000;
  const breakMs = (state.pomoBreakMin || 5) * 60 * 1000;
  const cycleMs = workMs + breakMs;
  const sprintElapsed = Math.max(0, ms - (state.pomoOffsetMs || 0));
  const posInCycle = sprintElapsed % cycleMs;
  const inFocus = posInCycle < workMs;
  const remaining = inFocus ? workMs - posInCycle : cycleMs - posInCycle;
  const cycleNum = Math.floor(sprintElapsed / cycleMs) + 1;

  $("#pomoBadge").textContent = inFocus
    ? `Sprint #${cycleNum}: ${fmtMMSS(remaining)} Focus`
    : `Sprint #${cycleNum}: ${fmtMMSS(remaining)} Break`;
  $("#pomoStatusText").textContent = inFocus
    ? `Focus block (${state.pomoWorkMin}m work / ${state.pomoBreakMin}m break)`
    : `Break window — stretch & hydrate (${state.pomoBreakMin}m)`;
}

function render() {
  const ms = elapsedMs();
  const sessionMin = ms / 60000;
  const ratio = Math.min(sessionMin / CAP_MINUTES, 1);

  $("#clock").textContent = fmt(ms);
  document.title = state.running ? `${fmtTitle(ms)} · Devlog Timer` : BASE_TITLE;

  // Update SVG Radial 10-Hour Dial
  const offset = DIAL_CIRCUMFERENCE * (1 - ratio);
  $("#dialArc").style.strokeDashoffset = offset.toFixed(2);
  $("#capPercent").textContent = `${(ratio * 100).toFixed(1)}% of 10h cap`;

  // Update Linear Progress Bar
  $("#bar").style.width = (ratio * 100).toFixed(2) + "%";

  // Check 2-hour devlog checkpoint chimes
  const checkpointIdx = Math.floor(sessionMin / REMIND_EVERY);
  if (state.running && checkpointIdx > lastChimeCheckpoint && sessionMin >= REMIND_EVERY) {
    lastChimeCheckpoint = checkpointIdx;
    playChime(sessionMin >= 480 ? "warn" : "bell");
  }

  // Phase status line
  const phase = $("#phase");
  const sinceNudge = sessionMin % REMIND_EVERY;
  if (!state.running && sessionMin === 0) {
    phase.textContent = "Ready — press Start (or Space) when you start coding";
    phase.className = "phase";
  } else if (sessionMin >= CAP_MINUTES) {
    phase.textContent = "OVER THE 10h CAP — post your devlog immediately, extra hours won't count!";
    phase.className = "phase danger";
  } else if (sessionMin >= 480) {
    phase.textContent = `PAST 8h WARNING LINE — post devlog now (${fmtMin(CAP_MINUTES - sessionMin)} until hard cap)`;
    phase.className = "phase warn";
  } else if (sinceNudge < 2 && sessionMin >= REMIND_EVERY) {
    phase.textContent = "2-hour checkpoint reached — great time to post a devlog with a screenshot!";
    phase.className = "phase warn";
  } else {
    phase.textContent = `Next 2h devlog nudge in ${fmtMin(REMIND_EVERY - sinceNudge)} · ${fmtMin(CAP_MINUTES - sessionMin)} left under 10h cap`;
    phase.className = "phase";
  }

  renderPomodoro(ms);

  // Today & Rollover metrics
  const liveDayMin = state.dayMinutes + sessionMin;
  $("#todayTotal").textContent = fmtMin(Math.round(liveDayMin));
  $("#weekTotal").textContent = fmtMin(Math.round(state.weekMinutes + sessionMin));
  $("#todayDevlogs").textContent = state.devlogsToday;

  const banked = Math.max(0, CAP_MINUTES - sessionMin);
  const safeBadge = $("#safeHours");
  safeBadge.textContent = `${fmtMin(Math.round(banked))} safe in session`;
  safeBadge.className = sessionMin >= 480 ? "badge-pill warn" : "badge-pill good";

  const overMin = liveDayMin - CAP_MINUTES;
  const overEl = $("#overCap");
  if (overMin > 0) {
    overEl.hidden = false;
    overEl.textContent = `⚠️ Over the 10-hour daily cap by ${fmtMin(Math.ceil(overMin))} — post a devlog now to bank your hours!`;
  } else {
    overEl.hidden = true;
  }

  renderLog();

  // 18-Vote Ship Gate Balance
  const netBalance = state.votes - state.ships * 18;
  $("#balance").textContent = netBalance >= 0 ? `+${netBalance}` : String(netBalance);
  $("#totalVotes").textContent = state.votes;
  $("#ships").textContent = state.ships;
  const nextShipCost = Math.max(0, (state.ships + 1) * 18 - state.votes);
  $("#votesNeeded").textContent = nextShipCost;

  const gateBadge = $("#shipGateBadge");
  if (netBalance < 0) {
    gateBadge.textContent = `Payout Frozen (Need ${Math.abs(netBalance)} votes)`;
    gateBadge.className = "badge-pill warn";
  } else {
    gateBadge.textContent = "Payout Gate: CLEAR";
    gateBadge.className = "badge-pill good";
  }

  // Sound toggle button state
  const soundBtn = $("#soundToggleBtn");
  soundBtn.setAttribute("aria-pressed", state.soundEnabled ? "true" : "false");
  soundBtn.textContent = state.soundEnabled ? "🔔 Chimes: ON" : "🔕 Chimes: MUTED";

  renderMilestones();
  compileMarkdown(sessionMin);

  $("#startBtn").disabled = state.running;
  $("#stopBtn").disabled = !state.running;
}

function startSession() {
  if (state.running) return;
  state.running = true;
  state.sessionStart = Date.now();
  playChime("click");
  save();
  render();
  clearInterval(timerId);
  timerId = setInterval(render, 1000);
}

function pauseSession() {
  if (!state.running) return;
  state.sessionAccum = elapsedMs();
  state.running = false;
  state.sessionStart = null;
  state.dayMinutes += state.sessionAccum / 60000;
  state.weekMinutes += state.sessionAccum / 60000;
  state.sessionAccum = 0;
  playChime("click");
  save();
  clearInterval(timerId);
  render();
}

$("#startBtn").addEventListener("click", startSession);
$("#stopBtn").addEventListener("click", pauseSession);

$("#resetBtn").addEventListener("click", () => {
  clearInterval(timerId);
  state.running = false;
  state.sessionStart = null;
  state.sessionAccum = 0;
  state.pomoOffsetMs = 0;
  lastChimeCheckpoint = 0;
  playChime("click");
  save();
  render();
});

$("#ffDemoBtn").addEventListener("click", () => {
  state.sessionAccum += 30 * 60 * 1000;
  playChime("click");
  save();
  render();
});

$("#devlogBtn").addEventListener("click", () => {
  const sessionMin = elapsedMs() / 60000;
  if (state.running) {
    state.sessionAccum = 0;
    state.sessionStart = Date.now();
  } else {
    state.sessionAccum = 0;
  }
  state.devlogsToday += 1;
  state.devlogLog = [new Date().toISOString(), ...(state.devlogLog || [])].slice(0, 5);
  state.dayMinutes = Math.max(0, state.dayMinutes + sessionMin - CAP_MINUTES);
  lastChimeCheckpoint = 0;
  playChime("bell");
  save();
  render();
});

$("#voteBtn").addEventListener("click", () => {
  state.votes += 1;
  playChime("click");
  save();
  render();
});

$("#vote5Btn").addEventListener("click", () => {
  state.votes += 5;
  playChime("click");
  save();
  render();
});

$("#shipBtn").addEventListener("click", () => {
  state.ships += 1;
  playChime("bell");
  save();
  render();
});

// Pomodoro controls
$$("[data-pomo-work]").forEach((btn) => {
  btn.addEventListener("click", () => {
    $$("[data-pomo-work]").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.pomoWorkMin = Number(btn.getAttribute("data-pomo-work"));
    state.pomoBreakMin = Number(btn.getAttribute("data-pomo-break"));
    $("#customPomoMin").value = String(state.pomoWorkMin);
    state.pomoOffsetMs = elapsedMs();
    playChime("click");
    save();
    render();
  });
});

$("#customPomoMin").addEventListener("change", (e) => {
  const val = Math.min(180, Math.max(5, Number(e.target.value) || 25));
  e.target.value = String(val);
  state.pomoWorkMin = val;
  state.pomoBreakMin = Math.max(5, Math.round(val / 5));
  $$("[data-pomo-work]").forEach((b) => b.classList.remove("active"));
  state.pomoOffsetMs = elapsedMs();
  save();
  render();
});

$("#pomoResetBtn").addEventListener("click", () => {
  state.pomoOffsetMs = elapsedMs();
  playChime("click");
  save();
  render();
});

// Sound & Chime Test
$("#soundToggleBtn").addEventListener("click", () => {
  state.soundEnabled = !state.soundEnabled;
  if (state.soundEnabled) playChime("bell");
  save();
  render();
});

$("#testChimeBtn").addEventListener("click", () => {
  const prev = state.soundEnabled;
  state.soundEnabled = true;
  playChime("bell");
  state.soundEnabled = prev;
});

// Timestamped Milestone Form
$("#milestoneForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = $("#milestoneInput");
  const text = input.value.trim();
  if (!text) return;
  const tag = $("#milestoneTag").value;
  const at = fmt(elapsedMs());
  state.milestones = [...(state.milestones || []), { tag, text, at, created: new Date().toISOString() }];
  input.value = "";
  playChime("click");
  save();
  render();
});

$("#clearMilestonesBtn").addEventListener("click", () => {
  state.milestones = [];
  save();
  render();
});

// Compiler extra fields
$("#trickyInput").value = state.trickyNote || "";
$("#tryItInput").value = state.tryItUrl || "https://aariv.me/devlog-timer/";

$("#trickyInput").addEventListener("input", (e) => {
  state.trickyNote = e.target.value;
  save();
  compileMarkdown(elapsedMs() / 60000);
});

$("#tryItInput").addEventListener("input", (e) => {
  state.tryItUrl = e.target.value;
  save();
  compileMarkdown(elapsedMs() / 60000);
});

async function copyCompiledMarkdown() {
  try {
    await navigator.clipboard.writeText($("#template").textContent);
    $("#copied").textContent = "Copied Markdown ✓";
    playChime("bell");
    setTimeout(() => ($("#copied").textContent = ""), 1800);
  } catch {
    $("#copied").textContent = "Select and copy manually";
  }
}

$("#copyBtn").addEventListener("click", copyCompiledMarkdown);

// JSON Export / Import
$("#exportJsonBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `devlog-timer-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

$("#importJsonInput").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result));
      Object.assign(state, defaultState, imported);
      save();
      $("#trickyInput").value = state.trickyNote || "";
      $("#tryItInput").value = state.tryItUrl || "https://aariv.me/devlog-timer/";
      render();
    } catch {
      alert("Invalid Devlog Timer JSON file.");
    }
  };
  reader.readAsText(file);
});

// Keyboard Shortcuts (Space: Start/Pause, M: Focus Milestone Note, C: Copy Markdown)
document.addEventListener("keydown", (e) => {
  const tag = (e.target && e.target.tagName) || "";
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.metaKey || e.ctrlKey || e.altKey) {
    return;
  }
  if (e.code === "Space") {
    e.preventDefault();
    if (state.running) pauseSession();
    else startSession();
  } else if (e.key === "m" || e.key === "M") {
    e.preventDefault();
    $("#milestoneInput").focus();
  } else if (e.key === "c" || e.key === "C") {
    e.preventDefault();
    copyCompiledMarkdown();
  }
});

document.addEventListener("visibilitychange", render);

// Tab-close guard when running session is past the 8h warning line
window.addEventListener("beforeunload", (e) => {
  if (state.running && elapsedMs() >= WARN_AT_MS) {
    e.preventDefault();
    e.returnValue = "";
  }
});

if (state.running) {
  timerId = setInterval(render, 1000);
}
render();
