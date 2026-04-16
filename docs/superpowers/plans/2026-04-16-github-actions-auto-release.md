# GitHub Actions Auto Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the manual release workflow with a `main`-triggered semantic-release pipeline that creates GitHub Releases and submits Chrome and Firefox builds automatically.

**Architecture:** Add a semantic-release config that computes versions from Conventional Commits without mutating tracked files, wire GitHub Actions to run release detection first and store submission second, and document the bootstrap tag plus required secrets so the automation can be enabled safely.

**Tech Stack:** GitHub Actions, semantic-release, Bun, WXT, Node.js, Markdown docs

---

### Task 1: Write release design and execution docs

**Files:**
- Create: `docs/superpowers/specs/2026-04-16-github-actions-auto-release-design.md`
- Create: `docs/superpowers/plans/2026-04-16-github-actions-auto-release.md`

- [ ] **Step 1: Write the design spec**

```md
# GitHub Actions Auto Release Design

## Summary

Set up a fully automatic release pipeline for `main` using `semantic-release`.
```

- [ ] **Step 2: Write the implementation plan**

```md
# GitHub Actions Auto Release Implementation Plan

**Goal:** Replace the manual release workflow with a `main`-triggered semantic-release pipeline.
```

- [ ] **Step 3: Verify docs exist**

Run: `find docs/superpowers -maxdepth 2 -type f | sort`
Expected: includes both `2026-04-16-github-actions-auto-release` files

- [ ] **Step 4: Commit**

```bash
git add docs/superpowers/specs/2026-04-16-github-actions-auto-release-design.md docs/superpowers/plans/2026-04-16-github-actions-auto-release.md
git commit -m "docs: add auto release design and plan"
```

### Task 2: Add semantic-release runtime and config

**Files:**
- Modify: `package.json`
- Create: `release.config.mjs`
- Modify: `wxt.config.ts`

- [ ] **Step 1: Add release dependencies**

```json
{
  "devDependencies": {
    "@semantic-release/commit-analyzer": "^13.0.1",
    "@semantic-release/exec": "^7.1.0",
    "@semantic-release/github": "^12.0.0",
    "@semantic-release/release-notes-generator": "^14.1.0",
    "conventional-changelog-conventionalcommits": "^9.1.0",
    "semantic-release": "^25.0.1"
  }
}
```

- [ ] **Step 2: Add semantic-release config**

```js
export default {
  branches: ['main'],
  plugins: [
    ['@semantic-release/commit-analyzer', { preset: 'conventionalcommits' }],
    ['@semantic-release/release-notes-generator', { preset: 'conventionalcommits' }],
    ['@semantic-release/github', { successComment: false, failComment: false }],
    [
      '@semantic-release/exec',
      {
        publishCmd:
          'if [ -n "${GITHUB_OUTPUT:-}" ]; then echo "new_release=true" >> "$GITHUB_OUTPUT"; fi',
      },
    ],
  ],
}
```

- [ ] **Step 3: Inject release versions into WXT builds**

```ts
const extensionVersion = process.env.EXTENSION_VERSION ?? packageJson.version

manifest: {
  version: extensionVersion,
  version_name: extensionVersion,
}
```

- [ ] **Step 4: Install and refresh lockfile**

Run: `bun install`
Expected: `bun.lock` updated with semantic-release packages

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lock release.config.mjs wxt.config.ts
git commit -m "build: add semantic-release configuration"
```

### Task 3: Replace the release workflow

**Files:**
- Modify: `.github/workflows/release.yml`

- [ ] **Step 1: Replace manual dispatch workflow**

```yaml
name: Release
on:
  push:
    branches:
      - main
concurrency:
  group: release-main
```

- [ ] **Step 2: Add release job**

```yaml
jobs:
  release:
    outputs:
      new_release: ${{ steps.semantic_release.outputs.new_release || 'false' }}
      release_version: ${{ steps.semantic_release.outputs.release_version }}
      release_git_tag: ${{ steps.semantic_release.outputs.release_git_tag }}
```

- [ ] **Step 3: Add publish-stores job**

```yaml
  publish-stores:
    needs: release
    if: needs.release.outputs.new_release == 'true'
```

- [ ] **Step 4: Validate workflow syntax**

Run: `sed -n '1,260p' .github/workflows/release.yml`
Expected: workflow uses Bun, semantic-release, and gated store submission

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: automate release and store submission"
```

### Task 4: Document operating requirements

**Files:**
- Modify: `README.md`
- Modify: `README.cn.md`

- [ ] **Step 1: Add release automation section to English README**

```md
## Release

- Pushes to `main` run automatic release detection
- Use Conventional Commits
- Bootstrap with `git tag v0.0.5 && git push origin v0.0.5`
```

- [ ] **Step 2: Add release automation section to Chinese README**

```md
## 发布

- 合并到 `main` 后自动检测 release
- 提交信息遵循 Conventional Commits
- 首次启用前先补 `v0.0.5` tag
```

- [ ] **Step 3: Review docs in place**

Run: `rg -n "Release|发布|Conventional Commits|v0.0.5" README.md README.cn.md`
Expected: both files describe the new release automation

- [ ] **Step 4: Commit**

```bash
git add README.md README.cn.md
git commit -m "docs: document automated release flow"
```

### Task 5: Verify the repository and ship

**Files:**
- Modify: none

- [ ] **Step 1: Run lint**

Run: `bunx oxlint`
Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `bun run compile`
Expected: PASS

- [ ] **Step 3: Run unit tests**

Run: `bun run test:unit`
Expected: PASS

- [ ] **Step 4: Run production build**

Run: `bun run build`
Expected: PASS

- [ ] **Step 5: Inspect final diff**

Run: `git status --short && git diff --stat`
Expected: only intended release automation files changed

- [ ] **Step 6: Create final commit**

```bash
git add .github/workflows/release.yml release.config.mjs package.json bun.lock wxt.config.ts README.md README.cn.md docs/superpowers/specs/2026-04-16-github-actions-auto-release-design.md docs/superpowers/plans/2026-04-16-github-actions-auto-release.md
git commit -m "feat: automate GitHub releases and store submissions"
```

- [ ] **Step 7: Push to main**

Run: `git push origin main`
Expected: remote `main` updated successfully
