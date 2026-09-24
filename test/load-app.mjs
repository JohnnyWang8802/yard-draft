// Loads the app's inline <script> into a sandbox with just enough of p5 to
// define its functions. Nothing draws; geometry and state logic can be called.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));

export function appSource() {
  const html = readFileSync(path.join(here, "..", "index.html"), "utf8");
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  // the app is the long one; the others are the vendor fallbacks
  return blocks.sort((a, b) => b.length - a.length)[0];
}

// Records what the renderers ask p5.brush to draw, and whether the "hand"
// flow field was on at the time. brush.wiggle() switches the field on (that
// is what analogTooth() calls); noField() switches it off.
export function recordingBrush() {
  const log = { lines: [], sets: [], shapes: [], hatch: [], wiggle: [], brushScale: 1, fieldOn: false };
  const names = ["HB", "2B", "2H", "charcoal", "crayon", "pastel", "rotring", "cpencil", "pen", "marker"];
  let shape = null;
  const b = {
    log,
    box: () => names.slice(),
    load() {}, scaleBrushes(k) { log.brushScale *= k; },
    wiggle(a) { log.fieldOn = true; log.wiggle.push(a); },
    field() { log.fieldOn = true; },
    noField() { log.fieldOn = false; },
    set(b, c, w) { log.sets.push(w); }, noFill() {}, noWash() {}, noHatch() {}, noMass() {}, noStroke() {}, noClip() {},
    fill() {}, fillBleed() {}, fillTexture() {}, hatch(sp) { log.hatch.push(sp); }, hatchStyle() {}, mass() {},
    polygon() {}, circle() {}, rect() {},
    line(x0, y0, x1, y1) {
      log.lines.push({ len: Math.hypot(x1 - x0, y1 - y0), field: log.fieldOn, x0, y0, x1, y1 });
    },
    beginShape() { shape = []; },
    vertex(x, y) { if (shape) shape.push([x, y]); },
    endShape() { if (shape) log.shapes.push(shape); shape = null; }
  };
  return b;
}

export function loadApp(extra = {}) {
  const rad = (d) => (d * Math.PI) / 180;
  const deg = (r) => (r * 180) / Math.PI;
  let seed = 1;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const noop = () => {};
  const el = () => ({
    classList: { add: noop, remove: noop, toggle: noop, contains: () => false },
    addEventListener: noop, setAttribute: noop, querySelector: () => null,
    querySelectorAll: () => [], style: {}, dataset: {}, childNodes: [{}], textContent: ""
  });
  const sandbox = {
    getComputedStyle: () => ({ getPropertyValue: () => "232px" }),
    console, Math, JSON, Date, Object, Array, Number, String, Promise, Error,
    setTimeout: noop, clearTimeout: noop, setInterval: noop, clearInterval: noop,
    requestAnimationFrame: noop,
    window: { addEventListener: noop, console },
    document: { getElementById: () => el(), querySelector: () => el(), querySelectorAll: () => [], addEventListener: noop, body: el() },
    navigator: {},
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    // p5, in DEGREES as the sketch runs it
    sin: (a) => Math.sin(rad(a)), cos: (a) => Math.cos(rad(a)), tan: (a) => Math.tan(rad(a)),
    atan2: (y, x) => deg(Math.atan2(y, x)),
    dist: (a, b, c, d) => Math.hypot(c - a, d - b),
    lerp: (a, b, t) => a + (b - a) * t,
    constrain: (v, lo, hi) => Math.max(lo, Math.min(hi, v)),
    random: (a, b) => (b === undefined ? (a === undefined ? rnd() : rnd() * a) : a + rnd() * (b - a)),
    randomSeed: (s) => { seed = (Math.abs(Math.floor(s)) % 2147483646) + 1; },
    noiseSeed: noop, millis: () => 0, redraw: () => undefined, loadImage: noop,
    width: 1200, height: 800,
    // p5 drawing calls: nothing is drawn, they only have to exist
    push: noop, pop: noop, translate: noop, scale: noop, resetMatrix: noop,
    stroke: noop, noStroke: noop, fill: noop, noFill: noop, strokeWeight: noop,
    strokeCap: noop, strokeJoin: noop, rectMode: noop, imageMode: noop,
    rect: noop, line: noop, circle: noop, image: noop, clear: noop, background: noop,
    beginShape: noop, vertex: noop, endShape: noop,
    ROUND: "round", SQUARE: "square", CORNER: "corner", CLOSE: "close", LINES: "lines",
    color: (c) => ({ c, setAlpha: noop, toString: () => String(c) }),
    lerpColor: (a) => a, red: () => 128, green: () => 128, blue: () => 128,
    drawingContext: {},
    ...extra
  };
  sandbox.window.self = sandbox;
  vm.createContext(sandbox);
  // top-level let/const stay script-scoped; expose what tests need
  const expose = `;globalThis.__app = { lot, gestures: () => gestures, setGestures: (g) => { gestures = g; },
    offsetEdge, pruneFold, ribbonEdge, insetClosed, isBoxy, bboxOf, shoelace, polyLen, sidesCovered,
    squareToBbox, findCorners, remapGestures, snapshotGesture, layoutLot, headingAt, densify, resample, chaikin,
    agentLay, ribbon, beautify, analogize, jitter, readSheet: agentReadSheet, undo: agentUndo, restoreSheet, saveSheet,
    renderGesture, ensureBrushes, B: () => B, strokeWeight01, drawHandLayer, nextPaper, withDrawScale, drawScale: () => drawScale, dashPath, titleBlockLayout, setTitle, sheetTitle: () => sheetTitle, clearGestures, titleTool: agentTitle, pal, paper: () => PAPERS[paperIdx].id, wallRuns, wallOpenings, snapAlongWall, inPoly,
    cache: () => sheetCache, setCache: (v) => { sheetCache = v; bakedUpTo = gestures.length; },
    setSize: (w, h) => { globalThis.width = w; globalThis.height = h; } };`;
  vm.runInContext(appSource() + expose, sandbox, { filename: "index.html#app" });
  return sandbox.__app;
}
