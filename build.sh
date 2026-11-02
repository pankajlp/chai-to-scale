#!/bin/bash
# Joins src/ into index.html (published as the artifact) and docs/index.html (the GitHub Pages site).
cd "$(dirname "$0")"
{ cat src/00-head.html; echo '<script>'; cat src/10-engine.js src/20-sims.js src/30-lessons.js src/40-cases.js src/50-app.js; echo '</script>'; } > index.html
mkdir -p docs
{ printf '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>body{margin:0}</style></head><body>'; cat index.html; printf '</body></html>\n'; } > docs/index.html
wc -c index.html docs/index.html
