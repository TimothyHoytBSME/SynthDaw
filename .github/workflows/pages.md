# pages.yml

GitHub Actions workflow that deploys the app to **GitHub Pages**: https://timothyhoytbsme.github.io/SynthDaw/. It uploads the `src` folder as the Pages artifact (no build step: the app is static ES modules with relative paths, so it runs as-is under the `/SynthDaw/` sub-path) and deploys it with `actions/deploy-pages`. It runs on every push to `master` or any `claude/**` working branch (last push wins) and can be started by hand from the Actions tab. `configure-pages` has `enablement: true`, so the first run turns Pages on for the repository (source: GitHub Actions) without a settings visit.

Pages is served over HTTPS, which Web MIDI and the autoplay-gated `AudioContext` require. Its CDN caches for up to about ten minutes, so a just-deployed change may need a hard reload.
