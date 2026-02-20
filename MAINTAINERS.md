# Maintainer Runbook

This document is the operational checklist for maintaining Sentinex.

## Daily/PR Workflow
1. Work on a feature branch (never directly on `main`).
2. Run local checks before opening PR:
   - `npm run build`
   - `npm run lint:policy`
   - `npm test`
3. Merge via PR only (squash preferred).

## Release Workflow
1. Ensure `main` is green in CI.
2. Update `CHANGELOG.md` for the new version.
3. Tag and push:
   - `git tag vX.Y.Z`
   - `git push origin vX.Y.Z`
4. Verify GitHub Action `Release` completed.
5. Verify the release exists under GitHub `Releases`.

## Homepage Deployment
Homepage source is in `sentinex-homepage/`.

- Automatic deploy triggers on pushes to `main` when files in `sentinex-homepage/**` change.
- Manual trigger: GitHub `Actions` → `Deploy Homepage` → `Run workflow`.
- Verify live site: `https://mibe1991.github.io/sentinex/`.

## Branch Protection (main)
Recommended settings:
- Require pull requests before merge
- Require status checks (`build-and-test (20)`, `build-and-test (22)`)
- Require up-to-date branch before merge
- Require conversation resolution
- Block force pushes
- Require linear history

## Security Process
1. For vulnerabilities, use private reporting (see `SECURITY.md`).
2. Prepare fix on private branch/fork if needed.
3. Add regression tests.
4. Release patch version (`vX.Y.Z`).

## Emergency Fix Flow
1. Create hotfix branch from `main`.
2. Implement minimal safe fix + test.
3. PR with clear impact summary.
4. Merge after review, tag patch release.
