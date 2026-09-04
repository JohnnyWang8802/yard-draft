# Yard Draft

Draw roughly. The hand finishes a courtyard you could hang, or build.

A landscape drafting tool on cream trace paper. Five beautifying brushes elevate a rough gesture into a hangable courtyard sketch — topography, hydrology, planting, paving, and enclosure — that also works as a base for further design. The sheet opens as an empty lot — dashed property line, north tick, scale — and stays empty until the hand draws. No preset garden.

This repository is the **WebMCP Challenge** submission for Yard Draft: the pre-challenge drafting sheet, plus agent tools on the same live canvas.

**Live (HTTPS):** https://johnnywang8802.github.io/yard-draft/

## Pre-challenge (already built)

What existed before this challenge window:

- Static one-page app (`index.html`) with p5.js + p5.brush
- Left rail tools: Terrain / Water / Planting / Path / Wall
- Hand drag → live polyline → settle commit on the lot
- Undo / Clear the sheet / Tone / Take the sheet (PNG)
- Local `serve.py` on port `8084`
- MIT license, GitHub Pages deploy path

Studio-internal prompt and audit files are **not** in this repository.

## This window — WebMCP additions

Added for the WebMCP Challenge so a person and an agent share one sheet:

| Tool | What it does |
| --- | --- |
| `lay_contour` | Lay a Terrain contour on the lot |
| `lay_water` | Lay water — open stroke becomes a rill; a closed loop becomes a pool |
| `lay_planting` | One point plants a tree; a longer stroke lays a hedge |
| `lay_path` | Lay a stone walk |
| `lay_wall` | Lay a wall / edge |
| `clear_sheet` | Clear the sheet; lot marks stay |
| `export_sheet` | Take the sheet as `yard-draft.png` |

Implementation notes:

- Tools call the **same commit path** as the hand (`agentLay` → existing gesture pipeline). Success flashes `laid` / `cleared` / `taken`.
- Registration uses `document.modelContext` / `navigator.modelContext` `registerTool` when the browser supports WebMCP.
- Fallback for local smoke without native WebMCP: `window.__YardDraftWebMCP.invoke(name, input)`.
- Points are inside the dashed lot, scaled `0–1` left→right / top→bottom.

No new UI chrome was added for the agent path; the rail stays the human pencil tray. Empty-lot line: *You sketch the idea. An agent finishes a courtyard you could hang.* Soft pill when tools are ready: *7 tools on this sheet*. Agent strokes share the hand path, ink a touch lighter — no Agent labels.

## Play locally

```bash
python3 serve.py
```

Then open http://127.0.0.1:8084

### WebMCP smoke (no native flag)

In the browser console:

```js
await window.__YardDraftWebMCP.invoke("lay_water", {
  points: [{x:0.2,y:0.4},{x:0.5,y:0.55},{x:0.8,y:0.35}]
})
```

### Native WebMCP

- ChatGPT in-app browser on the live HTTPS URL, or
- Chrome with `chrome://flags/#enable-webmcp-testing` enabled, then open the HTTPS (or localhost) URL and confirm tools under DevTools → Application → WebMCP.

## Panel

The 232px left rail is a pencil tray on the drafting table. Tools: Terrain / Water / Planting / Path / Wall (keys `t` / `w` / `p` / `r` / `l`, aliases `h` / `m` / `f`). Actions: Slip a plan under / Undo / Clear the sheet / Tone / Take the sheet.

- `Terrain` / `t` — drag contours
- `Water` / `w` — drag a rill; close a loop for a pool
- `Planting` / `p` — drag a hedge; click a tree
- `Path` / `r` — drag a stone walk
- `Wall` / `l` — drag a wall / retaining edge
- `Slip a plan under` / `u` — put a site plan beneath the trace; press again to lift it out. Dropping an image file anywhere on the sheet does the same. The plan is fitted inside the lot and read through the yellow sheet, so `Tone` doubles as how strongly it shows; hold `v` to lift the trace off it. It is part of the sheet, so it comes along in the export.
- `Undo` / `z` — undo last gesture
- `Clear the sheet` / `c` / Backspace — clear gestures; the lot stays
- `Tone` / `d` — cream sheet or night paper
- `Take the sheet` / `e` — export PNG (`yard-draft`)

## Stack

Static HTML/CSS/JS. p5.js plus p5.brush in `vendor/`. Local: `python3 serve.py` on port 8084. Host: GitHub Pages from `main` (long-term HTTPS).

## Deploy

GitHub Pages, source branch `main`, folder `/`. Confirm: HTTP 200 on `/`, empty lot with left rail, and WebMCP tools present in page source.

Pages URL: https://johnnywang8802.github.io/yard-draft/

## Rollback

Within 15 minutes, republish the previous `main` commit. Keep at least two green `main` commits. No database. Export PNG files stay on the user machine.

## License

MIT — see [LICENSE](LICENSE).

## Credit

Strokes by [p5.brush](https://github.com/acamposuribe/p5.brush).
