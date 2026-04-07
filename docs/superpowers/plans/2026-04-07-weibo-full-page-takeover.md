# Weibo Full-Page Takeover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Weibo rewrite hide the full host app shell, including the native header, whenever LoveForXb is enabled.

**Architecture:** Keep the ShadowRoot-mounted React app mounted under `body`, but change host region discovery so takeover targets the highest safe Weibo app root rather than only the center content node. Update the content-script binding to use that app root and extend selector tests so the restored page behavior stays symmetric.

**Tech Stack:** WXT content scripts, React 19, TypeScript, Vitest

---

## File Structure

- `src/features/weibo/content/host-selectors.ts`
  Resolve the full Weibo host app root for takeover.
- `src/features/weibo/content/host-selectors.test.ts`
  Verify selector resolution prefers the full host shell.
- `src/entrypoints/weibo.content.tsx`
  Apply page takeover to the resolved full app root instead of only the content region.
- `src/features/weibo/content/page-takeover.ts`
  Keep hide and restore behavior unchanged.
- `src/features/weibo/content/page-takeover.test.ts`
  Verify hide and restore symmetry on the takeover node.

### Task 1: Promote Host Selector To Full App Root

**Files:**
- Modify: `src/features/weibo/content/host-selectors.ts`
- Test: `src/features/weibo/content/host-selectors.test.ts`

- [ ] **Step 1: Write the failing selector test**

```ts
import { describe, expect, it } from 'vitest'

import { findWeiboHostRegions } from '@/features/weibo/content/host-selectors'

describe('findWeiboHostRegions', () => {
  it('prefers the full host app root for takeover', () => {
    document.body.innerHTML = `
      <div id="app">
        <header data-testid="header"></header>
        <main data-testid="mainCore">
          <div data-testid="center"></div>
        </main>
      </div>
    `

    expect(findWeiboHostRegions(document)?.appRoot).toBe(
      document.querySelector('#app'),
    )
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test:unit -- src/features/weibo/content/host-selectors.test.ts`
Expected: FAIL because the current selector returns `contentRoot` and does not resolve `#app`.

- [ ] **Step 3: Write the minimal selector implementation**

```ts
export interface WeiboHostRegions {
  appRoot: HTMLElement
}

const APP_ROOT_SELECTORS = [
  '#app',
  '[data-testid="app"]',
]

const CONTENT_SELECTORS = [
  '[data-testid="mainCore"]',
  'main',
  '#app > div',
]

export function findWeiboHostRegions(root: ParentNode): WeiboHostRegions | null {
  for (const selector of APP_ROOT_SELECTORS) {
    const appRoot = root.querySelector<HTMLElement>(selector)
    if (appRoot) {
      return { appRoot }
    }
  }

  for (const selector of CONTENT_SELECTORS) {
    const contentRoot = root.querySelector<HTMLElement>(selector)
    if (contentRoot?.parentElement instanceof HTMLElement) {
      return { appRoot: contentRoot.parentElement }
    }
  }

  return null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test:unit -- src/features/weibo/content/host-selectors.test.ts`
Expected: PASS with 1 passing test.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/content/host-selectors.ts src/features/weibo/content/host-selectors.test.ts
git commit -m "test: promote weibo takeover selector to app root"
```

### Task 2: Bind Full-Page Takeover In Content Script

**Files:**
- Modify: `src/entrypoints/weibo.content.tsx`
- Test: `src/features/weibo/content/page-takeover.test.ts`

- [ ] **Step 1: Write the failing takeover test**

```ts
import { describe, expect, it } from 'vitest'

import {
  applyPageTakeover,
  clearPageTakeover,
} from '@/features/weibo/content/page-takeover'

describe('applyPageTakeover', () => {
  it('hides and restores a full host app root', () => {
    const node = document.createElement('div')
    node.id = 'app'
    node.style.display = 'grid'

    applyPageTakeover(node)

    expect(node.getAttribute('data-loveforxb-hidden')).toBe('true')
    expect(node.getAttribute('aria-hidden')).toBe('true')
    expect(node.style.display).toBe('none')

    clearPageTakeover(node)

    expect(node.hasAttribute('data-loveforxb-hidden')).toBe(false)
    expect(node.hasAttribute('aria-hidden')).toBe(false)
    expect(node.style.display).toBe('grid')
  })
})
```

- [ ] **Step 2: Run test to verify the current binding still uses the old field**

Run: `pnpm test:unit -- src/features/weibo/content/page-takeover.test.ts src/features/weibo/content/host-selectors.test.ts`
Expected: FAIL in TypeScript or tests until `weibo.content.tsx` uses `appRoot`.

- [ ] **Step 3: Update the content-script binding**

```ts
function bindShellState({
  container,
  appRoot,
  settingsStore,
}: {
  container: HTMLElement
  appRoot: HTMLElement
  settingsStore: RewriteSettingsStore
}) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

  const applyShellState = () => {
    const settings = settingsStore.getSnapshot()
    const isDark = resolveIsDarkMode(settings.theme, mediaQuery.matches)

    container.classList.toggle('dark', isDark)

    if (settings.enabled) {
      applyPageTakeover(appRoot)
      return
    }

    clearPageTakeover(appRoot)
  }

  const unsubscribe = settingsStore.subscribe(applyShellState)
  const onSystemThemeChange = () => applyShellState()

  applyShellState()
  mediaQuery.addEventListener('change', onSystemThemeChange)

  return () => {
    unsubscribe()
    mediaQuery.removeEventListener('change', onSystemThemeChange)
    clearPageTakeover(appRoot)
  }
}
```

- [ ] **Step 4: Run focused tests**

Run: `pnpm test:unit -- src/features/weibo/content/host-selectors.test.ts src/features/weibo/content/page-takeover.test.ts`
Expected: PASS with both tests green.

- [ ] **Step 5: Run broader verification**

Run: `pnpm test:unit -- src/features/weibo/content/host-selectors.test.ts src/features/weibo/content/page-takeover.test.ts src/features/weibo/settings/rewrite-settings.test.ts`
Expected: PASS with no regression in rewrite setting behavior.

- [ ] **Step 6: Commit**

```bash
git add src/entrypoints/weibo.content.tsx src/features/weibo/content/page-takeover.test.ts
git commit -m "feat: take over full weibo app shell"
```
