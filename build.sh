#!/bin/bash
# Joins src/ into index.html, the single file that gets published.
cd "$(dirname "$0")"
{ cat src/00-head.html; echo '<script>'; cat src/10-engine.js src/20-sims.js src/30-lessons.js src/40-cases.js src/50-app.js; echo '</script>'; } > index.html
wc -c index.html
