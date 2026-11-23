# AGENTS.md

文档地图：`AGENTS.md`（本文，HOW）· `PRODUCT.md`（产品边界）· `DESIGN.md` /
`DESIGN.json`（UI 规则与 token）· `README.md` / `README.en.md`（面向用户）·
`src/lib/app-settings.ts`（设置项默认值）

## Agent skills

### Issue tracker

Specs and tickets are tracked in GitHub Issues. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the canonical triage label mapping. See `docs/agents/triage-labels.md`.

### Domain docs

This is a single-context repository. See `docs/agents/domain.md`.

## Project Overview

xb is a browser extension that rewrites weibo.com into a cleaner X-like reading
experience. Built with WXT, React 19, TypeScript, Tailwind CSS 4, shadcn/ui,
videojs(more use infos: https://videojs.org/docs/framework/react/llms.txt)
motion (same as framer-motion), Zustand, TanStack Query, and `@reactuses/core`.

## Developer Commands

```bash
bun run dev           # Start dev server (Chrome)
bun run dev:edge      # Start dev server (Edge)
bun run dev:firefox   # Start dev server (Firefox)
bun run build         # Build for Chrome/Chromium
bun run build:edge    # Build for Edge
bun run build:firefox # Build for Firefox
bun run test:unit     # Run unit tests (Vitest + jsdom)
bun run test:watch    # Run tests in watch mode
bun run compile       # TypeScript type check only
bun run lint          # Format + lint with oxfmt/oxlint
bun run knip          # Find unused files/exports/dependencies
bun run zip           # Package as .zip (Chrome)
bun run zip:edge      # Package as .zip (Edge)
bun run zip:firefox   # Package as .zip (Firefox)
```

- 包管理器使用 **bun**（项目已配置 `only-allow bun`）

## Verification Order

lint → typecheck → test → build

## Project Structure

```
src/
├── entrypoints/       # weibo.content, weibo-main-world, weibo-hide, options, …
├── lib/
│   ├── app-settings.ts / app-settings-store.ts / app-settings-hooks.ts
│   ├── custom-theme.ts / font-loader.ts / utils.ts
│   └── weibo/
│       ├── app/          # shell, root, layout, column width
│       ├── components/   # feed, profile, gen-image, media-player, …
│       ├── content/      # host selectors, shell state, page takeover, lifecycle
│       ├── workspace/    # auxiliary columns, canvas, workspace store
│       ├── hooks/ pages/ route/ inject/ platform/ utils/
│       ├── data/         # weibo-data (public), weibo-io + io/ (private)
│       ├── services/     # client, adapters, m-weibo-client, endpoints
│       ├── models/ queries/ rating/
├── components/ui/     # shadcn
└── test/
```

## Architecture Notes

- **Content Script UI**: WXT `createShadowRootUi` + `cssInjectionMode: 'ui'` —
  React in shadow root, isolated from Weibo CSS.
- **weibo-main-world.ts**: Unlisted script in page context; history + API
  bridges.
- **Settings Store**: `app-settings-store.ts` persists grouped settings in
  `chrome.storage` under `xb:app-settings`. Call `hydrate()` before use.
  Groups: `appearance`, `navigation`, `feed`, `imageGen`, `home`, `features`,
  `media`, `themes`.
- **Workspace**: multi-column layout is the only shell. The primary column
  follows the address bar. Auxiliary columns live in `workspace/workspace-store.ts`
  (`xb:workspace`): column order, per-column width, last location, and canvas
  scroll. Column width presets and `customColumnWidth` are navigation settings.
  Custom and dragged widths share `clampColumnWidth`: minimum 300px, no maximum.
- **Host Shell Lifecycle**: `host-shell-lifecycle.tsx` — inject bridge, wait for
  host DOM, hydrate, first-load redirect, mount UI, cleanup.
- **Data Layer**: `data/weibo-data.ts` is the public Weibo IO seam
  (load*/mutations + TanStack Query options). Private impl: `data/weibo-io.ts`
  re-exports `data/io/*` → `client.ts` / `m-weibo-client` + `adapters/`.
  UI and pages import `weibo-data`. Tests may mock `weibo-io`.
- **Status Cache**: `queries/status-cache.ts` — optimistic like/favorite/comment
  count across timeline/detail/comment caches.
- **xb Rating**: `rating/xb-rating.ts` (hooks + signed server client).

## Key Patterns

- **Hooks**: Prefer `@reactuses/core` over reimplementing common hooks.
- **Routing**: `parse-weibo-url.ts` → `page-descriptor.ts` (home, profile,
  follows, favorites, liked, notifications, explore, history, topics).
  Vocabulary for columns and media is in `GLOSSARY.md`.
- **Mounting**: `host-selectors.ts` waits for DOM; `shell-state.ts` binds to
  host; `page-takeover.ts` marks handled pages.
- **API bridge**: `install-api-bridge.ts` in page context; **m.weibo.cn**
  fallback for topic/search when desktop API is weak.
- **Media**: `download-media.ts` + `jszip` for batch; **themes**:
  `custom-theme.ts` → CSS variables via `shell-state.ts`.

## Code Patterns

### Settings

`useAppSettings` selects one field. Group hooks in `app-settings-hooks.ts`
return a whole group. Defaults and normalization live in `app-settings.ts`.
Write through `updateSettings` with a group patch.

```typescript
const contentFontSize = useAppSettings((s) => s.appearance.contentFontSize)
const navigation = useNavigationSettings()

void updateSettings({
  navigation: { columnWidth: 'custom', customColumnWidth: 640 },
})
```

### Mutations

- 跨页面乐观更新 → `status-cache.ts`
- 仅刷新查询 → mutation `meta.invalidates`

```typescript
const followMutation = useMutation({
  mutationFn: () => followUser(uid),
  meta: {
    invalidates: [
      ['weibo', 'profile'],
      ['weibo', 'profile-hover'],
    ],
  },
})
```

### Shared UI

- Profile 共享：`profile-shared.tsx`（`ProfileBanner`、`ProfileMutualFollowers`、`formatProfileCount`）
- 产品范围与 UI 原则：见 `PRODUCT.md`、`DESIGN.md`；列与媒体词汇见 `GLOSSARY.md`；评分/env 见下文 Extension
  Notes

## Testing

- Vitest + `jsdom`; setup: `src/test/setup.ts`
- Tests: `*.test.ts` / `*.spec.ts` alongside source; components use
  `@testing-library/react`

## Code Quality

- **Linter**: oxlint (strict, TS/React/unicorn)
- **Formatter**: oxfmt (no semicolons, single quotes, sorted imports)
- **TypeScript**: extends `.wxt/tsconfig.json`

## Browser Extension Notes

- Manifest v3 (WXT)
- Permissions: `storage`, `cookies`, `declarativeNetRequest` (media download request headers).
  Manifest source: `wxt.config.ts`.
- Host permissions: `https://weibo.com/*`, `https://www.weibo.com/*`,
  `https://*.sinaimg.cn/*`, `https://*.sinajs.cn/*`, `https://*.weibocdn.com/*`,
  `https://m.weibo.cn/*`, `https://xb-server.nnecec-3d5.workers.dev/*`
- Local persistence: settings and workspace use extension storage. Browsing
  history uses `localStorage` key `xb:browsing-history`.
- Web accessible resource: `weibo-main-world.js`
- Rating build env: `XB_SIGN_SECRET` / `VITE_XB_SIGN_SECRET`; optional
  `XB_SERVER_URL`. These signing secrets are bundled into the extension and
  should be treated as compatibility-only, not as a real security boundary.
