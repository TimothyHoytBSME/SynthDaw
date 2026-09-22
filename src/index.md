# index.html

App entry point and only HTML page (single-page app). Loads `css/main.css` and the `js/main.js` module. Contains the header and an empty `#piano-trigger` container that `pianoTrigger.js` fills in at runtime — no other markup should be hardcoded here as the app grows; new views get their own UI module that renders into `<main>`.
