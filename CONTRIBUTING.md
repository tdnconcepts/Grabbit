# Contributing to Grabbit

Report bugs and suggest improvements in [Grabbit issues](https://github.com/tdnconcepts/Grabbit/issues).

For a bug report, include your OS, app version, reproduction steps, and expected versus actual behavior. Remove private URLs, cookies, credentials, and personal paths from logs or screenshots before sharing.

## Development

Use the Node.js version in `.node-version` and the Bun version in `package.json`. Windows may require Visual Studio Build Tools and Python; macOS may require Xcode Command Line Tools; Linux needs Electron's system libraries.

```bash
git clone https://github.com/tdnconcepts/Grabbit.git
cd Grabbit
bun run bootstrap
bun run doctor
bun run dev
```

## Changes

- Target `main` with focused pull requests.
- Add regression tests at the layer that owns the behavior.
- Run `bun run check` and report any existing failures separately.
- Edit the English root `README.md` directly; app translations are maintained separately.
- Keep app translations synchronized when changing visible text.
- Keep credentials, app data, installers, caches, and local test artifacts out of Git.
- Preserve `LICENSE` and `THIRD_PARTY_NOTICES.txt`.

## Packaging

```bash
bun run build
bun run dist
```

Packaging locally does not authorize publishing releases or packages. Release destinations and integrations must be configured for Grabbit before use.
