#!/usr/bin/env bash
set -euo pipefail
python3 -m py_compile serve.py
test -f index.html
test -f LICENSE
test -f vendor/p5.min.js
test -f vendor/p5.brush.js
for t in lay_contour lay_water lay_planting lay_path lay_wall clear_sheet export_sheet; do
  grep -q "\"$t\"" index.html
done
grep -q registerYardWebMCP index.html
echo smoke_ok
