# Devlog Timer — Build Log

## 2026-10-27 — Chronograph Dial, Pomodoro Sprints, Web Audio Chimes & Markdown Compiler

1. **Interactive SVG Radial 10-Hour Dial:** Added a 260×260 SVG chronograph gauge (`#dialArc`) with `2h`, `4h`, `6h`, `8h WARN`, and `10h CAP` checkpoint markers alongside the linear progress bar.
2. **Dual-Mode Pomodoro Sprint Cadence:** Added `25/5m`, `50/10m`, `90/15m`, and custom focus/break sprint tracking layered inside the continuous 10-hour session timer.
3. **Web Audio API Chime Synthesizer:** Built a zero-asset synthesizer (`playChime`) using `AudioContext`, `OscillatorNode`, and exponential gain envelopes for 2-hour devlog nudges, 8-hour warnings, and UI feedback, complete with a persistent mute toggle.
4. **Timestamped Milestone Split Logger & Live Markdown Compiler:** Added a session split logger (`Feature`, `Bugfix`, `Refactor`, `Test`) that records `[HH:MM:SS]` timestamps into `localStorage` and compiles them live into Stardance's devlog Markdown format (`What I built`, `What was tricky`, `How to try it`) with a live word/character counter, JSON export/import, and keyboard shortcuts (`Space`, `M`, `C`).

## 2026-10-24 — Safety, Cadence, and Installability Refinements

1. **Tab-close guard:** A `beforeunload` listener asks for confirmation when a running session is past the 8h warning line (`WARN_AT_MS`), so a stray `Cmd+W` cannot silently kill an unposted session.
2. **Devlog history strip:** The Today card lists the last 5 `"I posted a devlog"` timestamps, newest first (`state.devlogLog`).
3. **Midnight rollover guard:** When the stored day changes, under-cap minutes reset for the new day, while uncapped overflow above 600 minutes carries forward so unposted hours are never silently wiped at midnight.
4. **PWA-lite:** Added `manifest.json` and 192px/512px icons so the timer can run in its own standalone window from the macOS dock.
