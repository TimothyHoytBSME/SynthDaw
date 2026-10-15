# pages.yml

GitHub Actions workflow that deploys the app to **GitHub Pages**: https://timothyhoytbsme.github.io/SynthDaw/. It stamps the commit's short hash into `index.html`'s "Build:" line (a local checkout shows `dev`), then uploads the `src` folder as the Pages artifact (no build step: the app is static ES modules with relative paths, so it runs as-is under the `/SynthDaw/` sub-path) and deploys it with `actions/deploy-pages`. It runs on every push to `master` and can be started by hand from the Actions tab. Pages had to be switched on once by hand (Settings → Pages → Source: GitHub Actions; the Actions token may not create the site), and the `github-pages` environment GitHub created then only lets the default branch deploy, so working branches are merged to master to publish.

Pages is served over HTTPS, which Web MIDI and the autoplay-gated `AudioContext` require. Its CDN caches for up to about ten minutes, so a just-deployed change may need a hard reload.
