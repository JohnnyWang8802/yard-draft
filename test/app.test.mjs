// Run with: node --test
import test from "node:test";
import assert from "node:assert/strict";
import { loadApp, recordingBrush } from "./load-app.mjs";

const RECT = [[0.10, 0.13], [0.90, 0.11], [0.91, 0.88], [0.10, 0.90], [0.10, 0.13]];
const SHAPES = {
  wall: ["wall", RECT],
  topo: ["topo", [[0.12, 0.30], [0.30, 0.26], [0.52, 0.28], [0.72, 0.24], [0.88, 0.27]]],
  pool: ["water", [[0.20, 0.50], [0.34, 0.45], [0.47, 0.50], [0.49, 0.64], [0.36, 0.71], [0.22, 0.66], [0.17, 0.57], [0.20, 0.50]]],
  rill: ["water", [[0.3, 0.15], [0.4, 0.35], [0.32, 0.55], [0.44, 0.75], [0.38, 0.92]]],
  path: ["path", [[0.62, 0.15], [0.66, 0.38], [0.60, 0.58], [0.67, 0.78], [0.63, 0.87]]],
  hedge: ["plant", [[0.72, 0.44], [0.80, 0.47], [0.87, 0.44]]],
  tree: ["plant", [[0.30, 0.82]]]
};
const pts = (list) => ({ points: list.map(([x, y]) => ({ x, y })) });

function fresh(extra) {
  const brush = recordingBrush();
  const app = loadApp({ brush, ...extra });
  app.layoutLot();
  app.ensureBrushes();
  return { app, brush };
}

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k)
  };
}

// ---- geometry -------------------------------------------------------------

test("isBoxy recognises a rectangle given only by its corners", () => {
  const { app } = fresh();
  const L = app.lot;
  const corners = RECT.map(([x, y]) => [L.x + x * L.w, L.y + y * L.h]);
  assert.equal(app.isBoxy(corners), true);
});

// Sheets come in every shape — a phone held upright is a tall narrow lot.
// Anything scaled off the lot must hold at all of them.
const SIZES = [[1200, 800], [595, 643], [480, 900], [2400, 1500]];

for (const [w, h] of SIZES) {
  test(`a rectangular wall laid by an agent comes out closed and boxy at ${w}x${h}`, () => {
    const { app } = fresh({ width: w, height: h });
    app.agentLay("wall", pts(RECT));
    const g = app.gestures()[0];
    assert.equal(g.boxy, true, "boxy");
    assert.equal(g.closed, true, "closed");
  });

  test(`a sparse stroke's hand layer keeps its corners at ${w}x${h}`, () => {
    // The hand layer is the faint trace of the gesture as drawn. Smoothing
    // five corner points cut a chamfer off every corner; from a real drag's
    // hundreds of points the same smoothing barely rounds them.
    const { app } = fresh({ width: w, height: h });
    app.agentLay("wall", pts(RECT));
    const g = app.gestures()[0];
    const L = app.lot;
    const tr = [L.x + 0.90 * L.w, L.y + 0.11 * L.h];   // the top-right corner as laid
    const near = Math.min(...g.hand.map((p) => Math.hypot(p[0] - tr[0], p[1] - tr[1])));
    assert.ok(near < Math.min(L.w, L.h) * 0.03, `hand layer passes ${near.toFixed(1)}px from the corner`);
  });
}

test("an octagonal pond is not mistaken for a box", () => {
  // It fills its bounding box and most of its sides run near an axis; what
  // it lacks is corners — it turns in eight 45° steps, never one right angle.
  const { app } = fresh();
  const L = app.lot;
  const pond = [[0.22, 0.40], [0.38, 0.36], [0.47, 0.46], [0.44, 0.62], [0.30, 0.66], [0.19, 0.58], [0.18, 0.48], [0.22, 0.40]]
    .map(([x, y]) => [L.x + x * L.w, L.y + y * L.h]);
  assert.equal(app.isBoxy(pond), false);
});

test("a hand-drawn rectangle with slightly rounded corners is still a box", () => {
  const { app } = fresh();
  const L = app.lot;
  const x0 = L.x + L.w * 0.2, y0 = L.y + L.h * 0.2, x1 = L.x + L.w * 0.8, y1 = L.y + L.h * 0.75, r = 9;
  const p = [];
  const arc = (cx, cy, a0) => { for (let k = 0; k <= 6; k++) { const a = (a0 + 90 * k / 6) * Math.PI / 180; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } };
  arc(x1 - r, y0 + r, -90); arc(x1 - r, y1 - r, 0); arc(x0 + r, y1 - r, 90); arc(x0 + r, y0 + r, 180);
  p.push(p[0]);
  const wobbly = p.map(([x, y], i) => [x + Math.sin(i * 1.7) * 1.5, y + Math.cos(i * 2.3) * 1.5]);
  assert.equal(app.isBoxy(wobbly), true);
});

test("an open wall is not mistaken for a box", () => {
  const { app } = fresh();
  app.agentLay("wall", pts([[0.09, 0.62], [0.09, 0.12], [0.62, 0.10]]));
  assert.equal(app.gestures()[0].boxy, false);
});

test("offset faces keep one point per spine point on a tight S-bend", () => {
  const { app } = fresh();
  const s = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    s.push([300 + t * 500, 400 + 160 * Math.sin(t * Math.PI * 2.2)]);
  }
  for (const w of [14, -14]) {
    const e = app.offsetEdge(s, w, false);
    assert.equal(e.length, s.length, `face ${w} dropped points`);
  }
});

test("insetClosed stays inside the basin it insets", () => {
  const { app } = fresh();
  const loop = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    loop.push([500 + 180 * Math.cos(a), 400 + 110 * Math.sin(a)]);
  }
  const bb = app.bboxOf(loop);
  const inner = app.bboxOf(app.insetClosed(loop, 20));
  assert.ok(inner.x > bb.x && inner.y > bb.y, "left/top inside");
  assert.ok(inner.x + inner.w < bb.x + bb.w && inner.y + inner.h < bb.y + bb.h, "right/bottom inside");
});

// ---- rendering -------------------------------------------------------------

// analogTooth() turns p5.brush's flow field on. Over a few pixels the field's
// direction beats the segment's own, so a short mark drawn under it is dragged
// across the sheet: that is how shore rings vanished and walls trailed
// diagonals from their corners. Short marks must be drawn with the field off.
for (const [name, [tool, list]] of Object.entries(SHAPES)) {
  test(`${name}: no short mark is drawn while the flow field is on`, () => {
    const { app, brush } = fresh();
    app.agentLay(tool, pts(list));
    brush.log.lines.length = 0;
    brush.log.fieldOn = false;
    app.renderGesture(app.gestures()[0]);
    const dragged = brush.log.lines.filter((l) => l.field && l.len < 20);
    assert.equal(dragged.length, 0,
      `${dragged.length} short marks under the field, e.g. ${dragged[0] && dragged[0].len.toFixed(1)}px`);
  });
}

// ---- resize ----------------------------------------------------------------

test("a resize round-trips the drawing exactly", () => {
  const { app } = fresh();
  app.agentLay("water", pts(SHAPES.pool[1]));
  const before = app.bboxOf(app.gestures()[0].pts);
  for (const [w, h] of [[760, 1000], [1400, 520], [1200, 800]]) {
    app.setSize(w, h);
    app.layoutLot();
    app.remapGestures(app.lot);
  }
  const after = app.bboxOf(app.gestures()[0].pts);
  for (const k of ["x", "y", "w", "h"]) {
    assert.ok(Math.abs(after[k] - before[k]) < 1e-6, `${k}: ${before[k]} -> ${after[k]}`);
  }
});

test("a resize keeps every gesture inside the lot", () => {
  const { app } = fresh();
  for (const [tool, list] of Object.values(SHAPES)) app.agentLay(tool, pts(list));
  app.setSize(1300, 360);
  app.layoutLot();
  app.remapGestures(app.lot);
  const L = app.lot;
  for (const g of app.gestures()) {
    const src = g.pts && g.pts.length ? g.pts : [[g.x, g.y]];
    const bb = app.bboxOf(src);
    assert.ok(bb.x >= L.x - 1 && bb.x + bb.w <= L.x + L.w + 1, `${g.kind} spills sideways`);
    assert.ok(bb.y >= L.y - 1 && bb.y + bb.h <= L.y + L.h + 1, `${g.kind} spills vertically`);
  }
});

// ---- agent tools -----------------------------------------------------------

test("read_sheet reports what was laid, where it was laid", () => {
  const { app } = fresh();
  app.agentLay("water", pts(SHAPES.pool[1]));
  app.agentLay("plant", pts(SHAPES.tree[1]));
  const r = app.readSheet();
  assert.equal(r.count, 2);
  // arrays built in the app's realm carry its prototype; compare plain data
  assert.deepEqual(JSON.parse(JSON.stringify(r.gestures.map((g) => [g.kind, g.form, g.by]))),
    [["water", "pool", "agent"], ["tree", "tree", "agent"]]);
  assert.ok(Math.abs(r.gestures[0].at.x - 0.33) < 0.05, `pool x ${r.gestures[0].at.x}`);
  assert.ok(Math.abs(r.gestures[1].at.y - 0.82) < 0.03, `tree y ${r.gestures[1].at.y}`);
});

test("undo_gesture takes the last gesture off and reports it", () => {
  const { app } = fresh();
  app.agentLay("topo", pts(SHAPES.topo[1]));
  app.agentLay("path", pts(SHAPES.path[1]));
  const r = app.undo();
  assert.equal(r.ok, true);
  assert.equal(r.removed, "path");
  assert.equal(app.gestures().length, 1);
  assert.equal(app.undo().ok, true);
  assert.equal(app.undo().ok, false, "nothing left to undo");
});

// ---- keeping the sheet -----------------------------------------------------

test("a saved sheet restores with the same gestures in the same places", () => {
  const storage = memoryStorage();
  const one = fresh({ localStorage: storage }).app;
  for (const [tool, list] of Object.values(SHAPES)) one.agentLay(tool, pts(list));
  one.saveSheet();
  const was = one.readSheet().gestures;

  const two = fresh({ localStorage: storage }).app;
  assert.equal(two.restoreSheet(), true);
  const now = two.readSheet().gestures;
  assert.equal(now.length, was.length);
  for (let i = 0; i < was.length; i++) {
    assert.equal(now[i].kind, was[i].kind);
    assert.ok(Math.abs(now[i].at.x - was[i].at.x) < 0.01 && Math.abs(now[i].at.y - was[i].at.y) < 0.01,
      `${was[i].kind} moved`);
  }
});

test("a sheet saved on one screen restores inside the lot on another", () => {
  const storage = memoryStorage();
  const one = fresh({ localStorage: storage }).app;
  for (const [tool, list] of Object.values(SHAPES)) one.agentLay(tool, pts(list));
  one.saveSheet();

  const two = fresh({ localStorage: storage, width: 640, height: 1000 }).app;
  assert.equal(two.restoreSheet(), true);
  for (const g of two.readSheet().gestures) {
    assert.ok(g.at.x > 0 && g.at.x < 1 && g.at.y > 0 && g.at.y < 1, `${g.kind} at ${g.at.x},${g.at.y}`);
  }
});

test("clearing the sheet clears the saved copy", () => {
  const storage = memoryStorage();
  const { app } = fresh({ localStorage: storage });
  app.agentLay("topo", pts(SHAPES.topo[1]));
  app.saveSheet();
  assert.ok(storage.getItem("garth.sheet.v1"));
  app.setGestures([]);
  app.saveSheet();
  assert.equal(storage.getItem("garth.sheet.v1"), null);
});

// ---- pen pressure ----------------------------------------------------------

test("pen pressure maps to ink weight, with the middle drawing as a mouse does", () => {
  const { app } = fresh();
  assert.equal(app.strokeWeight01([]), 1, "no pen samples: unchanged");
  assert.ok(Math.abs(app.strokeWeight01([0.5, 0.5, 0.5]) - 1) < 1e-9, "middle pressure is weight 1");
  assert.ok(app.strokeWeight01([0.15, 0.2]) < 0.85, "a light touch draws light");
  assert.ok(app.strokeWeight01([0.9, 0.95]) > 1.25, "a heavy press draws heavy");
  assert.ok(app.strokeWeight01([0]) >= 0.65 && app.strokeWeight01([1]) <= 1.4, "clamped");
});

test("a gesture's weight scales every stroke weight it sets, and only its own", () => {
  const { app, brush } = fresh();
  app.agentLay("path", pts(SHAPES.path[1]));
  const g = app.gestures()[0];
  const weights = (w) => {
    if (w === 1) delete g.weight; else g.weight = w;
    brush.log.sets.length = 0;
    app.renderGesture(g);
    return brush.log.sets.filter((v) => typeof v === "number");
  };
  const plain = weights(1);
  const heavy = weights(1.3);
  assert.ok(plain.length > 0);
  assert.equal(heavy.length, plain.length);
  for (let i = 0; i < plain.length; i++) {
    assert.ok(Math.abs(heavy[i] - plain[i] * 1.3) < 1e-9, `set #${i}: ${plain[i]} -> ${heavy[i]}`);
  }
  // nothing leaks to the next gesture drawn
  assert.deepEqual(weights(1), plain);
});

test("a pen weight survives save and restore", () => {
  const storage = memoryStorage();
  const one = fresh({ localStorage: storage }).app;
  one.agentLay("topo", pts(SHAPES.topo[1]));
  one.gestures()[0].weight = 1.25;
  one.saveSheet();
  const two = fresh({ localStorage: storage }).app;
  two.restoreSheet();
  assert.equal(two.gestures()[0].weight, 1.25);
});

// ---- composition -------------------------------------------------------------

test("a resize keeps the composition: what was inside the wall stays inside it", () => {
  const { app } = fresh();
  app.agentLay("wall", pts([[0.08, 0.10], [0.92, 0.09], [0.93, 0.91], [0.08, 0.92], [0.08, 0.10]]));
  app.agentLay("plant", pts([[0.30, 0.82]]));
  app.agentLay("plant", pts([[0.79, 0.70]]));
  app.agentLay("water", pts(SHAPES.pool[1]));
  for (const [w, h] of [[375, 812], [1400, 420]]) {
    app.setSize(w, h);
    app.layoutLot();
    app.remapGestures(app.lot);
    const [wall, ...rest] = app.gestures();
    const wb = app.bboxOf(wall.pts);
    for (const g of rest) {
      const c = g.x != null ? [g.x, g.y] : (() => { const b = app.bboxOf(g.pts); return [b.x + b.w / 2, b.y + b.h / 2]; })();
      assert.ok(c[0] > wb.x && c[0] < wb.x + wb.w && c[1] > wb.y && c[1] < wb.y + wb.h,
        `${g.kind} left the wall at ${w}x${h}`);
    }
  }
});

test("a sparse curved gesture's hand layer is a curve, not a polygon", () => {
  // An agent lays a pool as eight points. Resampled with straight segments
  // the trace comes back as an octagon around a smooth basin.
  const { app } = fresh();
  app.agentLay("water", pts(SHAPES.pool[1]));
  const h = app.gestures()[0].hand;
  let worst = 0;
  for (let i = 1; i < h.length - 1; i++) {
    const a = Math.atan2(h[i][1] - h[i - 1][1], h[i][0] - h[i - 1][0]);
    const b = Math.atan2(h[i + 1][1] - h[i][1], h[i + 1][0] - h[i][0]);
    let d = Math.abs(b - a) * 180 / Math.PI;
    if (d > 180) d = 360 - d;
    worst = Math.max(worst, d);
  }
  assert.ok(worst < 30, `sharpest turn in the trace is ${worst.toFixed(0)}°`);
});

// ---- the tools know about each other ---------------------------------------

const COURT = [[0.15, 0.15], [0.85, 0.15], [0.85, 0.85], [0.15, 0.85], [0.15, 0.15]];
const THROUGH = [[0.50, 0.05], [0.52, 0.35], [0.48, 0.65], [0.50, 0.95]];   // crosses top and bottom

test("a path through a wall opens a gate at each crossing", () => {
  const { app } = fresh();
  app.agentLay("wall", pts(COURT));
  app.agentLay("path", pts(THROUGH));
  const wall = app.gestures()[0];
  const gates = app.wallOpenings(wall);
  assert.equal(gates.length, 2, `openings ${gates.length}`);
  const runs = app.wallRuns(wall, wall.pts);
  assert.equal(runs.length, 2, "a ring cut twice is two runs");
  for (const run of runs) {
    assert.equal(run.closed, false);
    for (const p of run.pts) {
      for (const o of gates) {
        assert.ok(Math.hypot(p[0] - o.x, p[1] - o.y) >= o.r * 0.99, "wall drawn inside a gate");
      }
    }
  }
});

test("the wall's hand trace opens at the gate too", () => {
  const { app, brush } = fresh();
  app.agentLay("wall", pts(COURT));
  app.agentLay("path", pts(THROUGH));
  const wall = app.gestures()[0];
  const gates = app.wallOpenings(wall);
  brush.log.shapes.length = 0;
  app.drawHandLayer(wall);
  const bridged = brush.log.shapes.flat().filter((p) =>
    gates.some((o) => Math.hypot(p[0] - o.x, p[1] - o.y) < o.r * 0.9));
  assert.ok(brush.log.shapes.length > 0, "trace drawn");
  assert.equal(bridged.length, 0, `${bridged.length} trace points bridge a gate`);
});

test("a wall no path crosses stays whole", () => {
  const { app } = fresh();
  app.agentLay("wall", pts(COURT));
  app.agentLay("path", pts([[0.3, 0.3], [0.5, 0.45], [0.7, 0.4]]));   // inside, never crossing
  const wall = app.gestures()[0];
  assert.equal(app.wallOpenings(wall).length, 0);
  const runs = app.wallRuns(wall, wall.pts);
  assert.equal(runs.length, 1);
  assert.equal(runs[0].closed, true);
});

test("contours stop at a pool's edge instead of running through it", () => {
  const { app, brush } = fresh();
  app.agentLay("water", pts(SHAPES.pool[1]));
  app.agentLay("topo", pts([[0.05, 0.58], [0.3, 0.56], [0.6, 0.6], [0.95, 0.57]]));   // straight across the pool
  const pool = app.gestures()[0];
  brush.log.shapes.length = 0;
  brush.log.lines.length = 0;
  // the contour family and the faint trace of the stroke as drawn — a viewer
  // cannot tell one from the other, so neither may cross the water
  app.renderGesture(app.gestures()[1]);
  app.drawHandLayer(app.gestures()[1]);
  const inside = (p) => app.inPoly(p[0], p[1], pool.pts);
  const wet = brush.log.shapes.flat().filter(inside).length + brush.log.lines.filter((l) => inside([l.x0, l.y0])).length;
  assert.ok(brush.log.shapes.length > 0, "contours drawn");
  assert.equal(wet, 0, `${wet} contour points drawn in the water`);
});

test("contours away from water are left whole", () => {
  const { app, brush } = fresh();
  app.agentLay("water", pts([[0.7, 0.8], [0.85, 0.78], [0.88, 0.9], [0.72, 0.92], [0.7, 0.8]]));
  app.agentLay("topo", pts(SHAPES.topo[1]));
  brush.log.shapes.length = 0;
  app.renderGesture(app.gestures()[1]);
  const plain = fresh();
  plain.app.agentLay("topo", pts(SHAPES.topo[1]));
  plain.brush.log.shapes.length = 0;
  plain.app.renderGesture(plain.app.gestures()[0]);
  assert.equal(brush.log.shapes.length, plain.brush.log.shapes.length, "same number of contour runs");
});

test("a hedge drawn along a wall settles parallel to it", () => {
  const { app } = fresh();
  app.agentLay("wall", pts([[0.1, 0.2], [0.5, 0.2], [0.9, 0.2]]));  // three points: two is below the stroke minimum
  // wobbling between 3% and 7% of the lot below the wall
  const wobble = [];
  for (let i = 0; i <= 12; i++) wobble.push([0.2 + 0.6 * i / 12, 0.2 + (i % 2 ? 0.07 : 0.03)]);
  app.agentLay("plant", pts(wobble));
  const wall = app.gestures()[0], hedge = app.gestures()[1];
  const wy = app.bboxOf(wall.pts).y + app.bboxOf(wall.pts).h / 2;
  const d = hedge.pts.slice(2, -2).map((p) => p[1] - wy);
  const mean = d.reduce((a, b) => a + b, 0) / d.length;
  const sd = Math.sqrt(d.reduce((a, b) => a + (b - mean) ** 2, 0) / d.length);
  assert.ok(mean > 0, "stays on the side it was drawn");
  assert.ok(sd < app.lot.h * 0.006, `still wobbling: sd ${sd.toFixed(1)}px`);
});

test("a hedge nowhere near a wall is left as drawn", () => {
  const { app } = fresh();
  app.agentLay("wall", pts([[0.1, 0.1], [0.5, 0.1], [0.9, 0.1]]));
  assert.equal(app.gestures().length, 1, "the wall was laid");
  const L = app.lot;
  const far = [];
  for (let i = 0; i <= 12; i++) far.push([L.x + L.w * (0.2 + 0.05 * i), L.y + L.h * (0.8 + (i % 2 ? 0.03 : 0))]);
  const out = app.snapAlongWall(far, L.h * 0.02);
  assert.deepEqual(JSON.parse(JSON.stringify(out)), JSON.parse(JSON.stringify(far)));
});

test("a new gesture that changes an older one forces a full rebake", () => {
  const { app } = fresh();
  app.agentLay("wall", pts(COURT));
  app.setCache({ stub: true });
  app.agentLay("plant", pts([[0.3, 0.4]]));          // a tree changes nothing already drawn
  assert.ok(app.cache(), "a tree kept the cache");
  app.agentLay("path", pts(THROUGH));                // this path cuts the wall
  assert.equal(app.cache(), null, "the wall must be redrawn with its gates");
});
