# Devlog Timer — Stardance 10-Hour Cap Chronograph & Devlog Workbench

I built **Devlog Timer** after learning the hard way how the Hack Club Stardance devlog cap works: on my very first big catch-up devlog, I lost roughly **78 hours** of logged coding credit because a single devlog caps out at **10 hours** (`600 minutes`). If you get into a flow state and forget to post incremental devlogs as you build, anything past the 10-hour ceiling evaporates.

So I built this single-page chronograph and devlog workbench to sit in a pinned browser tab (or installed as a standalone macOS dock app) right next to my editor. It tracks my live coding session against the 10-hour cap, chimes every 2 hours using the Web Audio API, lets me log timestamped commit notes while I work, and compiles those notes directly into a ready-to-paste Stardance Markdown devlog.

- **Live App:** [https://aariv.me/devlog-timer/](https://aariv.me/devlog-timer/)
- **Stack:** Vanilla HTML5, CSS3, ES2022 JavaScript, inline SVG radial gauge, Web Audio API oscillator synth, `localStorage` persistence (0 external dependencies).

![Devlog Timer watching the cap](screenshot.png)

---

## What It Does

### 1. Interactive SVG Radial 10-Hour Cap Dial & Linear Progress Bar
- Draws your live elapsed session against the **10-hour (`600m`) single-devlog cap** on both a custom SVG radial dial (`stroke-dashoffset` mapped to a `653.45px` circumference arc) and a linear checkpoint bar.
- Marks **2-hour devlog checkpoint ticks** (`2h`, `4h`, `6h`, `8h`, `10h`) and highlights the **8-hour red warning zone** (`WARN_AT_MS`) so you always post with a 2-hour safety cushion before hitting the hard ceiling.
- Updates `document.title` with the live `HH:MM:SS` clock so you can see your elapsed time from a pinned browser tab without switching windows.

### 2. Dual-Mode Pomodoro Sprint Cadence + Web Audio API Chimes
- Runs a **Pomodoro Sprint Timer** (`25/5m`, `50/10m`, `90/15m`, or custom focus minutes) inside your continuous 10-hour session clock so you can take regular breaks without losing your cumulative devlog window.
- Synthesizes harmonic bell chimes (`C6 → G6` sine envelope), warning buzzers, and tactile button clicks directly in the browser using the **Web Audio API** (`AudioContext` + `OscillatorNode` + `GainNode`)—no MP3 files or network requests needed, with a one-click mute toggle (`🔔 Chimes: ON / MUTED`).

### 3. Timestamped Commit & Milestone Split Logger
- Press **`M`** at any point during a coding session to jot a quick note tagged as `Feature`, `Bugfix`, `Refactor`, or `Test / QA`.
- Each split records the exact session timestamp (`[01:42:18] [Feature] Added midnight rollover carry...`) in `localStorage` so when it's time to post your devlog, you don't have to stare at `git log` trying to remember what you did over the last two hours.

### 4. Live Markdown Devlog Compiler
- Automatically compiles your logged session splits, session duration, *"What was tricky"* notes, and live demo URL into a formatted Markdown devlog (`What I built`, `What was tricky`, `How to try it`) with a live word and character counter.
- Press **`C`** (or click **Copy Compiled Markdown**) to copy the Markdown straight to your clipboard.

### 5. Midnight Rollover Guard & Tab-Close Protection
- **Midnight Rollover Math:** When the calendar date rolls over (`state.day !== today()`), hours already banked under the cap reset cleanly for the new day, but any **uncapped overflow above 600 minutes** carries forward into the new day instead of vanishing silently at midnight, triggering a red *"Over the 10-hour daily cap"* banner until you post.
- **8-Hour Tab-Close Guard:** A `beforeunload` listener intercepts stray `Cmd+W` presses whenever a running session is past the 8-hour warning line.
- **18-Vote Ship Gate Tracker:** Stardance requires 18 peer ratings per shipped project. The workbench tracks your peer votes cast vs. ships (`votes - ships * 18`) and warns you if your balance drops below zero.
- **JSON Backup & PWA Manifest:** Export/import your entire `localStorage` state as JSON at any time, or install the app to your dock via `manifest.json`.

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| <kbd>Space</kbd> | Start or pause the active coding session |
| <kbd>M</kbd> | Focus the timestamped milestone split input |
| <kbd>C</kbd> | Copy the compiled Markdown devlog to clipboard |

---

## Running Locally

Because `Devlog Timer` uses zero external dependencies or build steps, you can open `index.html` directly or serve the folder with any static server:

```sh
git clone https://github.com/draarivpatel-ui/devlog-timer.git
cd devlog-timer
python3 -m http.server 8080
# Open http://localhost:8080
```

## License

[MIT License](LICENSE) — Built by Aariv Patel ([aariv.me](https://aariv.me)).
