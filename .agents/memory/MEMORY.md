# Project memory index

- [macOS 26 Electron Audio Service](macos-26-electron-audio-service.md) — Electron 42 can crash-loop `audio.mojom.AudioService`; disable out-of-process Audio Service on Darwin 25+.
- [Finish before PR](finish-before-pr.md) — close every related follow-up (tests, locales, README, CHANGELOG) before proposing a PR.
- [No AI attribution](no-ai-attribution.md) — never add Co-Authored-By or "Generated with" lines to commits or PRs.
- [LOC limits are architecture signals](loc-limits-are-architecture-signals.md) — never raise the LOC cap to land a change; extract a cohesive concern instead.
- [Renderer test & UI API gotchas](renderer-test-and-ui-api-gotchas.md) — base-nova takes a `render` prop, never Radix `asChild`; `@testing-library/user-event` is not installed, use `fireEvent`.
- [TypeScript & oxlint boundary gates](typescript-and-oxlint-boundary-gates.md) — `"types": []` does not block explicit electron imports; oxlint restricted-import globs need `**`.
- [Inherited ELECTRON_RUN_AS_NODE](electron-run-as-node-leak.md) — agent/editor shells can carry `ELECTRON_RUN_AS_NODE=1`; hand-launched Electron then crashes with "no export named 'BrowserWindow'". Strip it or use `bun run smoke:download`.
- [Linux theme portal race](linux-theme-portal-race.md) — wrong theme on first Linux launch is unexplained; read the `theme:startup` log lines and never repro it by stopping xdg-desktop-portal.
- [YouTube auto-caption -orig tracks](youtube-auto-caption-orig-tracks.md) — automatic_captions mixes byte-identical bare+-orig ASR twins with flaky tlang translations; subtitle 429 ≠ IP block.
- [yt-dlp stdout corrupts scraped paths](ytdlp-stdout-drops-non-ascii.md) — four ways the stdout we scrape media/subtitle paths from mangles them, all failing silently as ENOENT; fixed with `--encoding utf-8` + a decoding line reader.
- [Dependabot never bumps overrides](dependabot-never-bumps-overrides.md) — stale `overrides` pins become the vulnerable versions; app.asar ships no node_modules (main bundles everything, guarded by check:main-bundle); never delete lock entries to re-resolve.
- [shadcn CLI writes a bogus cn import](shadcn-cli-cn-import.md) — `shadcn add` imports from "cn" and installs an unrelated package; revert deps, fix the import.
