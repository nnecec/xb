# GitHub Actions Auto Release Design

## Summary

Set up a fully automatic release pipeline for `main` using `semantic-release`.
Every push to `main` should evaluate Conventional Commit messages since the last
tag. When releasable commits are present, the pipeline should:

1. Calculate the next semantic version
2. Create a Git tag and GitHub Release
3. Build Chrome and Firefox extension archives
4. Submit both builds to their stores

The pipeline should not update `package.json`, should not maintain a checked-in
`CHANGELOG.md`, and should skip releases when commits are only `docs`, `chore`,
`refactor`, `test`, `style`, or `ci`.

## Goals

- Release automatically from `main`
- Derive versions from Conventional Commits
- Publish a GitHub Release and both browser-store submissions from the same
  release version
- Keep release metadata out of the repo working tree
- Reuse the existing store secrets and WXT submit flow

## Non-Goals

- Pre-release channels
- Release PR workflows
- Version bumps committed back to the repository
- Manual tag management after the one-time bootstrap tag

## Trigger Model

The release workflow runs on pushes to `main`.

It has two jobs:

- `release`: installs dependencies, verifies the codebase, then runs
  `semantic-release`
- `publish-stores`: runs only when `release` created a new version; it checks
  out the newly created tag, builds zip artifacts, and submits them to Chrome
  Web Store and Firefox Add-ons

This keeps GitHub Release creation as the source of truth while ensuring store
submissions use the exact released commit.

## Versioning Rules

Use standard Conventional Commits via `semantic-release/commit-analyzer`.

- `feat:` => minor
- `fix:` or `perf:` => patch
- `BREAKING CHANGE:` footer or `type!:` => major
- `docs:`, `chore:`, `refactor:`, `test:`, `style:`, `ci:` => no release

Only stable releases are published from `main`.

## Repository State

The repository currently has `package.json` version `0.0.5` but no git tags.
Before enabling the workflow in production, create a one-time bootstrap tag:

```bash
git tag v0.0.5
git push origin v0.0.5
```

Without this bootstrap tag, the first automatic release may not align with the
already published extension version.

## CI and Package Management

The workflow should use Bun consistently because the repository has:

- `bun.lock`
- `preinstall: npx only-allow bun`

The existing workflow uses `pnpm`, which is inconsistent with the project and
risks failing during install. The new workflow should switch to:

- `oven-sh/setup-bun`
- `bun install --frozen-lockfile`
- `bunx semantic-release`
- existing npm scripts executed through Bun-compatible package scripts

## Build Version Injection

The extension package version cannot remain pinned at `0.0.5` during automated
store submissions because browser stores require each upload to use a new
version number.

To keep version metadata out of git while still producing valid store builds:

- `semantic-release` computes the next version
- the workflow passes that version as `EXTENSION_VERSION`
- `wxt.config.ts` reads `EXTENSION_VERSION` first and falls back to
  `package.json` for local development

This keeps the repository static while ensuring release builds use the correct
manifest version.

## GitHub Release Flow

`semantic-release` should be configured to:

- read commit history on `main`
- generate release notes
- create and publish the GitHub Release
- expose the resolved version to later workflow steps
- live in `release.config.mjs`

No changelog file or package version should be committed back to the repo.

## Store Submission Flow

The store-submission job should:

1. Depend on the release job
2. Exit unless a new version was published
3. Checkout the exact released tag
4. Build zip artifacts with `bun run zip` and `bun run zip:firefox`, using the
   resolved `EXTENSION_VERSION`
5. Submit artifacts using `wxt submit`

Required repository secrets:

- `CHROME_EXTENSION_ID`
- `CHROME_CLIENT_ID`
- `CHROME_CLIENT_SECRET`
- `CHROME_REFRESH_TOKEN`
- `FIREFOX_EXTENSION_ID`
- `FIREFOX_JWT_ISSUER`
- `FIREFOX_JWT_SECRET`

`GITHUB_TOKEN` is also required so `semantic-release` can create the tag and
GitHub Release.

## Failure Handling

- If verification or `semantic-release` fails, the workflow stops and no store
  submission runs.
- If store submission fails, the GitHub Release remains published and the
  workflow fails clearly in the `publish-stores` job.
- There is no automatic rollback because store and GitHub release states are
  external side effects.

## Validation

Before merging the automation:

1. Run repository verification locally in this order:
   `oxlint` -> `bun run compile` -> `bun run test:unit` -> `bun run build`
2. Confirm the workflow YAML passes syntax checks
3. Confirm `semantic-release` config resolves outputs used by the workflow
4. Document the bootstrap tag and required commit-message conventions
