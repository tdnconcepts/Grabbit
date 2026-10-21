# Grabbit CI and builds

- `ci.yml` runs the repository quality gate and Windows unit/component tests.
- Fixture and cold-start workflows exercise download and startup behavior.
- `release.yml` is a manually dispatched Windows artifact build with read-only repository permissions.
- Registry publishing, external website notifications, and inherited package-manager publishers are not configured.

See [release-runbook.md](release-runbook.md) for build verification and sharing guidance. A source push is not a release and does not authorize publishing packages, tagging versions, or changing visibility.
