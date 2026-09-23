# devServer.py

Static dev server for `src/` (`python tools/devServer.py [port]`, default 4329), used by `.claude/launch.json`. It's Python's stdlib `http.server` plus a `Cache-Control: no-store` header. Plain `python -m http.server` let the preview browser keep serving stale ES modules after edits, even across server restarts, which previously had to be worked around by bumping the port. No dependencies. Any other static server still works for running the app.
