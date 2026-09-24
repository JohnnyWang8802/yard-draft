# Garth

Draw roughly. The hand finishes a courtyard you could hang, or build.

A garth is the enclosed garden of a cloister. Garth is a sketching sheet for them: five brushes that turn a rough gesture into a finished landscape drawing — terrain, water, planting, paving and walls — on yellow trace, over a site plan if you have one. It is for catching a design idea in the minute you have it, and for keeping the result as a drawing worth framing. A person and an AI agent can draw on the same sheet.

**Live:** https://johnnywang8802.github.io/yard-draft/

## What it does

**Five brushes that read each other.** Each tool beautifies the stroke you give it — and takes account of what is already on the sheet:

- a path drawn through a wall opens a gate in it, the cut ends finished across the wall;
- contours stop at a pool's edge and resume on the far side;
- a hedge drawn along a wall settles parallel to it.

These are worked out as the sheet is drawn, not stored, so undo and clear need nothing special: take the path away and the wall closes up.

**A plan under the trace.** Slip a site plan beneath the sheet — pick a file, drop one on the sheet, or paste a screenshot — and trace over it. It reads through the paper, muted the way a survey reads through real trace.

**Papers.** Yellow trace, cool drafting vellum, brown kraft, or night.

**A pen, a finger, or a phone.** Pen pressure sets how heavily a stroke is inked. Once a pen has drawn, fingers only pan and zoom, so a resting palm lays no ink; without a pen, one finger draws and two pinch. Below 720px wide the rail folds to a strip of icons.

**Kept.** The sheet saves itself as you draw and comes back after a refresh or on another screen size, fitted whole into the new lot.

**Taken.** *Take the sheet* redraws the drawing at about A3/300dpi — regenerated at that size, not scaled up — and lays it out as a drawing: the sheet, then a strip with its title and date, the scale and north. Title the sheet in the field under its bottom-left corner.

## Agent tools (WebMCP)

The same sheet is registered as ten WebMCP tools. They go through the same commit path as a hand stroke. Points are the dashed lot in `0–1`, left→right, top→bottom.

| Tool | What it does |
| --- | --- |
| `read_sheet` | Everything on the sheet: each gesture's kind and form, whether a hand or an agent laid it, where it sits, each wall's gates; the paper, title and date |
| `lay_contour` | Lay a terrain contour |
| `lay_water` | Lay water — an open stroke is a rill, a closed loop a pool |
| `lay_planting` | One point plants a tree; a longer stroke lays a hedge |
| `lay_path` | Lay a stone walk |
| `lay_wall` | Lay a wall |
| `title_sheet` | Name the sheet (up to 60 characters) |
| `undo_gesture` | Take the last gesture back |
| `clear_sheet` | Clear the sheet |
| `export_sheet` | Take the sheet as `garth.png` |

Registration uses `document.modelContext` / `navigator.modelContext` `registerTool` where the browser supports WebMCP — Chrome with `chrome://flags/#enable-webmcp-testing`, on HTTPS or localhost; check DevTools → Application → WebMCP. Elsewhere the same tools are on `window.__YardDraftWebMCP.invoke(name, input)`:

```js
await window.__YardDraftWebMCP.invoke("read_sheet", {})
```

## Keys

| Key | |
| --- | --- |
| `t` `w` `p` `r` `l` | Terrain, Water, Planting, Path, Wall (aliases `h` `m` `f`) |
| `u` | Slip a plan under / lift it out |
| `v` (hold) | Lift the trace off the plan |
| `z` | Undo |
| `c`, Backspace | Clear the sheet |
| `d` | Next paper |
| `e` | Take the sheet |
| Space-drag, middle or right drag | Pan |
| Wheel, pinch | Zoom |

## Run it

```bash
python3 serve.py
```

Then open http://127.0.0.1:8084. Everything is static: one `index.html`, with p5.js and p5.brush in `vendor/`.

## Tests

```bash
./scripts/smoke.sh
```

Structural checks, then `node --test` (Node 22, no dependencies). The tests load the page's own script into a sandbox with a p5 stub and a recording p5.brush, so the real app code runs headless: geometry and shape recognition at several sheet sizes, the rules each brush follows, resize and save/restore round trips, pressure, the relationships between brushes, and the agent tools.

## The vendored p5.brush is patched

p5.brush builds its flow field once, on a grid sized to the canvas as it was at load, and never again; a stroke drawn with the field on outside that grid is dropped. So enlarging the window left areas where contours and wall faces came out broken, and the export — drawn on a canvas several times larger — lost most of its drawing. `vendor/p5.brush.js` rebuilds the grid when the canvas size changes. It is the only difference from upstream 2.2.2; `smoke.sh` fails if a re-vendor drops it. The CDN fallback in the page is unpatched.

## Deploy

GitHub Pages from `main`, folder `/`. Rollback: republish the previous `main` commit. There is no server state; sheets live in each visitor's browser and exports on their machine.

## History

Garth began as *Yard Draft*, a submission to the WebMCP Challenge; the repository keeps that name.

## License

MIT — see [LICENSE](LICENSE). Strokes by [p5.brush](https://github.com/acamposuribe/p5.brush).
