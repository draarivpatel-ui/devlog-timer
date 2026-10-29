# Devlog Timer

I built Devlog Timer after learning the hard way how the Hack Club Stardance devlog cap works: on my very first big catch-up devlog, I lost roughly 78 hours of logged coding credit because a single devlog caps out at 10 hours (`600 minutes`). If you get into a flow state and forget to post incremental devlogs while you build, anything past the 10-hour ceiling doesn't count.

![Devlog Timer tracking a live coding session against the 10-hour cap](screenshot.png)

* **Try it live:** [https://aariv.me/devlog-timer/](https://aariv.me/devlog-timer/)
* **Source Repository:** [https://github.com/draarivpatel-ui/devlog-timer](https://github.com/draarivpatel-ui/devlog-timer)

## What It Does

I keep this app open in a pinned browser tab (or installed as a PWA in my macOS Dock) while I code:
* **10-Hour Cap Radial Gauge & Progress Bar:** Shows your live coding session against the 10-hour (`600m`) single-devlog ceiling on an SVG circular dial and linear bar, with tick marks at `2h`, `4h`, `6h`, `8h`, and `10h`. Once you pass the 8-hour warning mark, the dial turns red and activates a `beforeunload` tab-close guard so you don't accidentally close the tab before posting.
* **Pomodoro Sprint Timer + Web Audio Chimes:** Runs focus/break sprints (`25/5m`, `50/10m`, `90/15m`, or custom minutes) inside your continuous 10-hour session clock. Every 2 hours, it plays a synthesized bell chime using the browser's `AudioContext` (`OscillatorNode` + `GainNode`, no external audio files needed).
* **Timestamped Commit & Milestone Splits:** Press `M` while working to log quick notes tagged as `Feature`, `Bugfix`, `Refactor`, or `Test / QA` with the exact session timestamp (`[01:42:18]`).
* **Live Markdown Devlog Compiler & `.md` Export:** Automatically formats your logged session splits, session duration, *"What was tricky"* notes, and live URL into a ready-to-paste Stardance Markdown devlog. Press `C` to copy it to your clipboard or click **Download .md File**.
* **Midnight Rollover Math & 18-Vote Gate Tracker:** When the date rolls over at midnight (`state.day !== today()`), hours already banked under the cap reset cleanly for the new day, while any uncapped overflow above 600 minutes carries forward so you don't lose track of unposted work. It also tracks your peer rating balance (`votes - ships * 18`).

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `Space` | Start or pause the active coding session |
| `M` | Focus the timestamped milestone split input |
| `C` | Copy the compiled Markdown devlog to your clipboard |

## Running Locally

Devlog Timer uses plain HTML, CSS, and JavaScript with zero external dependencies or build steps:

```sh
git clone https://github.com/draarivpatel-ui/devlog-timer.git
cd devlog-timer
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

## License

MIT License. See [LICENSE](LICENSE).
