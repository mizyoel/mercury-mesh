# Changelog

All notable changes to this package will be documented in this file.

## [1.3.1] - 2026-04-06

- Ship the CLI runtime support files under `lib/` so installed packages can execute `mercury-mesh update` without module resolution failures.
- Add an npm pack regression test that asserts the published tarball contains the CLI entrypoint and its runtime dependencies.

## [1.3.0] - 2026-04-06

- Promote the Mercury Mesh package version to 1.3.0.
- Align stamped agent templates, workflow release labels, and mirrored test fixtures with the 1.3.0 release line.

## [1.2.0] - 2026-04-05

- Promote the Mercury Mesh package version to 1.2.0.
- Expand the Vanguard subsystem with actionable Horizon authorization, Genesis progression, and richer operational CLI flows.

## [1.1.0] - 2026-04-04

- Add "GENESIS IN THE VOID" — cinematic origin narrative from the Mesh's perspective across Dimension Null.

## [1.0.0] - 2026-04-04

- Merge the EVELUTION branch into `master` for the 1.0.0 release line.
- Add the expanded CLI, nervous-system runtime modules, and mesh workflow scaffolding.
- Align package metadata, agent templates, and tests with the 1.0.0 release version.

## [0.9.4] - 2026-04-02

- Package Mercury Mesh as a publishable npm module under `@mizyoel/mercury-mesh`.
- Export runtime paths for templates, docs, skills, and the coordinator prompt.
- Add smoke tests and a publish workflow for npm releases.