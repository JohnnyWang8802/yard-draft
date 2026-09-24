#!/usr/bin/env bash
# Structural checks, then the behaviour tests. Run from the repo root.
set -euo pipefail
cd "$(dirname "$0")/.."
python3 -m py_compile serve.py
test -f index.html
test -f LICENSE
test -f vendor/p5.min.js
test -f vendor/p5.brush.js
for t in lay_contour lay_water lay_planting lay_path lay_wall read_sheet undo_gesture clear_sheet export_sheet; do
  grep -q "\"$t\"" index.html || { echo "missing WebMCP tool: $t"; exit 1; }
done
grep -q registerYardWebMCP index.html
# the vendored p5.brush carries a local patch; a re-vendor must not drop it
grep -q 'q.width!==W' vendor/p5.brush.js || { echo "p5.brush resize patch missing"; exit 1; }
node --test test/*.test.mjs
echo smoke_ok
