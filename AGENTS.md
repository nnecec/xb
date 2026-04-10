# AGENTS.md

## Project Overview

xb is a browser extension that rewrites weibo.com into a cleaner X-like reading experience. Built with WXT, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand, and TanStack Query.

## Developer Commands

```bash
npm run dev          # Start dev server with hot reload
npm run build        # Build for Chrome/Chromium
npm run build:firefox # Build for Firefox
npm run test:unit    # Run unit tests (Vitest + jsdom)
npm run test:watch   # Run tests in watch mode
npm run compile      # TypeScript type check only
npm run zip          # Package as .zip (Chrome)
npm run zip:firefox  # Package as .zip (Firefox)
```

## Verification Order

lint → typecheck → test → build

## Project Structure

```
src/
├── entrypoints/          # Extension entry points
│   ├── weibo.content.tsx       # Main content script (weibo.com)
│   ├── weibo-main-world.ts      # Runs in page context, installs history bridge
│   ├── weibo-hide.content.ts    # Hides original Weibo UI
│   └── options/          # Options page
├── features/weibo/       # Core feature code
│   ├── app/              # App shell, root, layout components
│   ├── components/       # Feature-specific components
│   ├── pages/            # Page-level components (home, profile, status)
│   ├── services/         # API clients, adapters, repositories
│   ├── models/           # Data models
│   ├── route/            # Router sync, page descriptors
│   ├── content/          # Host selectors, shell state, page takeover
│   └── inject/           # Script injection (history bridge)
├── components/ui/        # shadcn/ui components
└── lib/                  # Core: utils, settings store (Zustand)
```

## Architecture Notes

- **Content Script UI**: Uses WXT's `createShadowRootUi` with `cssInjectionMode: 'ui'` to mount React into a shadow root, keeping styles isolated from Weibo's global CSS.
- **weibo-main-world.ts**: Runs as an **unlisted script** directly in the page context (not a content script), installs a history bridge for router sync.
- **Settings Store**: Zustand store (`src/lib/app-settings-store.ts`) that persists to `chrome.storage`. Must call `hydrate()` before use.
- **API Layer**: Axios-based client with adapters in `features/weibo/services/adapters/` that transform Weibo's API responses into internal models.

## Key Patterns

- **Host selectors** in `features/weibo/content/host-selectors.ts` wait for Weibo DOM elements before mounting
- **Shell state** (`shell-state.ts`) binds React app to Weibo's existing DOM structure
- **Page takeover** (`page-takeover.ts`) marks pages as handled
- **Router sync** (`route/router-sync.ts`) keeps extension in sync with Weibo's navigation

## Testing

- Vitest with `jsdom` environment
- Setup file: `src/test/setup.ts` (imports jest-dom)
- Test files: `*.test.ts` or `*.spec.ts` alongside source files
- Component tests use `@testing-library/react`

## Code Quality

- **Linter**: oxlint (strict mode, TypeScript/React/unicorn plugins)
- **Formatter**: oxfmt (semicolon: false, single quotes, sorted imports)
- **TypeScript**: Extends `.wxt/tsconfig.json`; `baseUrl: './.wxt'`

## Browser Extension Notes

- Manifest v3 (WXT default)
- Permissions: `storage`
- Host permissions: `https://weibo.com/*`, `https://www.weibo.com/*`
- Web accessible resource: `weibo-main-world.js` (injected at runtime)
