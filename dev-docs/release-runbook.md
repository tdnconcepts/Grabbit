# Grabbit build and release notes

## Build locally

Use the pinned Node.js and Bun versions, then run:

```bash
bun run check
bun run dist:win
```

Windows output is written to `dist/Grabbit-win-x64-Setup.exe` and `dist/Grabbit-win-x64-Portable.exe`.

## Build in GitHub Actions

Run the **Build Grabbit Windows artifacts** workflow manually. It runs the quality gate, builds Windows output, scans the packed output, and uploads the installers as an Actions artifact.

The workflow has read-only repository permissions. It does not publish a GitHub Release, push tags, update package registries, or notify an external website.

## Before sharing a build

- Verify a real packaged-app startup and a fixture download.
- Check trimming and local diagnostics export.
- Scan source and Git history for secrets with a redacted report.
- Preserve `LICENSE` and `THIRD_PARTY_NOTICES.txt`.
- Keep telemetry credentials and user data out of the bundle.

The app updater is configured for `tdnconcepts/Grabbit`. Publishing update metadata or a public release is a separate, explicitly authorized step. Existing installed copies do not change merely because source files are pushed.
