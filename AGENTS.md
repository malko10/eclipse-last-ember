# ECLIPSE publishing instructions

This is the user's game source checkout. GitHub `origin` is the source of truth for future game changes. The main branch deploys `dist/` to GitHub Pages through `.github/workflows/pages.yml`.

For requests to modify this game in this chat/workspace:

1. Implement the requested change in this checkout and inspect the diff. Preserve unrelated user changes.
2. Run `npm run check`, `npm test`, and `npm run build:offline`. For graphics/runtime changes, also run the native canvas/offline tests when the canvas package is available; the latter are host-specific and not required on GitHub's Linux runner.
   On this Windows host, `npm` may not be on PATH although `node` is available. In that case run `node --check` for dist/app.js, engine.js, renderer.js and audio.js; run `node --test tests/engine.test.mjs tests/playability.test.mjs tests/expansion.test.mjs tests/combat.test.mjs`; then run `node scripts/build-offline.mjs`. Stop on a nonzero exit code.
3. Commit the task's source and generated offline HTML, then push `main` to GitHub `origin`. The user explicitly requested that edits here are reflected on GitHub; no separate publishing question is needed for ordinary game updates.
4. Check the resulting GitHub Actions run and fix failures before claiming successful deployment. Include the actual game/repository URLs in the response.

Do not set up a file watcher to push incomplete edits. A successful push triggers deployment automatically. If access or a push fails, keep local work and report the exact unfinished step. Do not force-push or overwrite external commits; integrate remote changes first.

The `.openai/hosting.json` file retains the original Sites identity for optional existing hosting. GitHub updates must use ordinary Git with the GitHub origin, not a Sites source helper that could replace Git remotes. Do not change visibility, permissions, or the old Site's audience as part of routine updates. Never commit credentials or tokens.
