# Weibo Emoticon Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache Weibo emoticon config from `/ajax/statuses/config` once per session with React Query and use it to render inline emoticon images for matched bracketed phrases in status and comment text.

**Architecture:** Add a small emoticon normalization layer in the Weibo service boundary, expose one infinite-cache React Query hook for all consumers, and update the text renderer so only plain-text chunks participate in emoticon replacement. Tighten `url_struct` adaptation so only entries with `url_type` become links, preventing false-positive entity replacement before the emoticon pass runs.

**Tech Stack:** React 19, React Router 7, TanStack Query 5, TypeScript, Vitest, Testing Library

---

## File Structure

- `src/features/weibo/models/emoticon.ts`
  Define normalized emoticon config types shared by repository, query hook, and renderer.
- `src/features/weibo/services/adapters/emoticon.ts`
  Normalize `/ajax/statuses/config` into grouped data plus a flattened phrase lookup.
- `src/features/weibo/services/adapters/emoticon.test.ts`
  Verify normalization, invalid-item dropping, and duplicate-phrase behavior.
- `src/features/weibo/services/endpoints.ts`
  Add the `/ajax/statuses/config` endpoint constant.
- `src/features/weibo/services/weibo-repository.ts`
  Add `loadEmoticonConfig()` and export raw payload types only where needed.
- `src/features/weibo/app/emoticon-query.ts`
  Centralize the shared query key, query options, and `useEmoticonConfigQuery()` hook.
- `src/features/weibo/app/emoticon-query.test.ts`
  Verify the stable query key and infinite cache options.
- `src/features/weibo/app/app-root.tsx`
  Prewarm the emoticon query once on mount using the shared query options.
- `src/features/weibo/app/app-root.test.tsx`
  Verify the app root prefetches emoticon config exactly once.
- `src/features/weibo/utils/transform.ts`
  Filter `url_struct` so only items with `url_type` become `urlEntities`.
- `src/features/weibo/services/adapters/timeline.test.ts`
  Cover the new `url_type` link filtering behavior on timeline payloads.
- `src/features/weibo/services/adapters/status.test.ts`
  Cover the same `url_type` filtering behavior on status detail payloads.
- `src/features/weibo/components/status-text.tsx`
  Add plain-text emoticon parsing and inline image rendering for both `StatusText` and `MentionInlineText`.
- `src/features/weibo/components/status-text.test.tsx`
  Cover matched and unmatched phrases plus mixed mention and emoticon rendering.

### Task 1: Add Emoticon Config Types, Normalizer, And Repository Loader

**Files:**
- Create: `src/features/weibo/models/emoticon.ts`
- Create: `src/features/weibo/services/adapters/emoticon.ts`
- Create: `src/features/weibo/services/adapters/emoticon.test.ts`
- Modify: `src/features/weibo/services/endpoints.ts`
- Modify: `src/features/weibo/services/weibo-repository.ts`

- [ ] **Step 1: Write the failing normalization test**

```ts
import { describe, expect, it } from 'vitest'

import { adaptEmoticonConfigResponse } from '@/features/weibo/services/adapters/emoticon'

describe('adaptEmoticonConfigResponse', () => {
  it('keeps groups and builds a phrase lookup map', () => {
    expect(
      adaptEmoticonConfigResponse({
        emoticon: {
          ZH_CN: {
            'PC热门表情': [
              {
                phrase: '[赞]',
                url: 'https://face.t.sinajs.cn/zan.png',
              },
              {
                phrase: '[泪奔]',
                url: 'https://face.t.sinajs.cn/leiben.png',
              },
            ],
            其他: [
              {
                phrase: '[心]',
                url: 'https://face.t.sinajs.cn/xin.png',
              },
              {
                phrase: '',
                url: 'https://face.t.sinajs.cn/invalid.png',
              },
              {
                phrase: '[赞]',
                url: 'https://face.t.sinajs.cn/zan-latest.png',
              },
            ],
          },
        },
      }),
    ).toEqual({
      groups: [
        {
          title: 'PC热门表情',
          items: [
            { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' },
            { phrase: '[泪奔]', url: 'https://face.t.sinajs.cn/leiben.png' },
          ],
        },
        {
          title: '其他',
          items: [
            { phrase: '[心]', url: 'https://face.t.sinajs.cn/xin.png' },
            { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan-latest.png' },
          ],
        },
      ],
      phraseMap: {
        '[赞]': { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan-latest.png' },
        '[泪奔]': { phrase: '[泪奔]', url: 'https://face.t.sinajs.cn/leiben.png' },
        '[心]': { phrase: '[心]', url: 'https://face.t.sinajs.cn/xin.png' },
      },
    })
  })

  it('normalizes missing locale data to empty collections', () => {
    expect(adaptEmoticonConfigResponse({})).toEqual({
      groups: [],
      phraseMap: {},
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `bun run test:unit -- src/features/weibo/services/adapters/emoticon.test.ts`
Expected: FAIL because the emoticon adapter module does not exist yet.

- [ ] **Step 3: Write the minimal normalization and repository implementation**

```ts
// src/features/weibo/models/emoticon.ts
export interface WeiboEmoticonItem {
  phrase: string
  url: string
}

export interface WeiboEmoticonGroup {
  title: string
  items: WeiboEmoticonItem[]
}

export interface WeiboEmoticonConfig {
  groups: WeiboEmoticonGroup[]
  phraseMap: Record<string, WeiboEmoticonItem>
}
```

```ts
// src/features/weibo/services/adapters/emoticon.ts
import type { WeiboEmoticonConfig, WeiboEmoticonGroup, WeiboEmoticonItem } from '@/features/weibo/models/emoticon'

export interface WeiboEmoticonPayload {
  emoticon?: {
    ZH_CN?: Record<string, Array<{ phrase?: string; url?: string }>>
  }
}

function normalizeItem(entry: { phrase?: string; url?: string }): WeiboEmoticonItem | null {
  const phrase = entry.phrase?.trim() ?? ''
  const url = entry.url?.trim() ?? ''
  if (!phrase || !url) {
    return null
  }
  return { phrase, url }
}

export function adaptEmoticonConfigResponse(payload: WeiboEmoticonPayload): WeiboEmoticonConfig {
  const localeGroups = payload.emoticon?.ZH_CN ?? {}
  const groups: WeiboEmoticonGroup[] = []
  const phraseMap: Record<string, WeiboEmoticonItem> = {}

  for (const [title, entries] of Object.entries(localeGroups)) {
    const items = (entries ?? [])
      .map((entry) => normalizeItem(entry ?? {}))
      .filter((item): item is WeiboEmoticonItem => item !== null)

    groups.push({ title, items })

    for (const item of items) {
      phraseMap[item.phrase] = item
    }
  }

  return { groups, phraseMap }
}
```

```ts
// src/features/weibo/services/endpoints.ts
export const WEIBO_ENDPOINTS = {
  forYou: '/ajax/feed/unreadfriendstimeline',
  following: '/ajax/feed/friendstimeline',
  sideCards: '/ajax/side/cards',
  statusDetail: '/ajax/statuses/show',
  statusComments: '/ajax/statuses/buildComments',
  statusLongText: '/ajax/statuses/longtext',
  statusConfig: '/ajax/statuses/config',
  profileInfo: '/ajax/profile/info',
  profileDetail: '/ajax/profile/detail',
  profilePosts: '/ajax/statuses/mymblog',
} as const
```

```ts
// src/features/weibo/services/weibo-repository.ts
import type { WeiboEmoticonConfig } from '@/features/weibo/models/emoticon'
import {
  adaptEmoticonConfigResponse,
  type WeiboEmoticonPayload,
} from '@/features/weibo/services/adapters/emoticon'

export async function loadEmoticonConfig(): Promise<WeiboEmoticonConfig> {
  const payload = await fetchWeiboJson<WeiboEmoticonPayload>(WEIBO_ENDPOINTS.statusConfig)
  return adaptEmoticonConfigResponse(payload)
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `bun run test:unit -- src/features/weibo/services/adapters/emoticon.test.ts`
Expected: PASS with 2 passing tests covering group normalization and empty-payload fallback.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/models/emoticon.ts src/features/weibo/services/adapters/emoticon.ts src/features/weibo/services/adapters/emoticon.test.ts src/features/weibo/services/endpoints.ts src/features/weibo/services/weibo-repository.ts
git commit -m "feat: add weibo emoticon config loader"
```

### Task 2: Add The Shared Infinite-Cache Query And Prewarm It In App Root

**Files:**
- Create: `src/features/weibo/app/emoticon-query.ts`
- Create: `src/features/weibo/app/emoticon-query.test.ts`
- Modify: `src/features/weibo/app/app-root.tsx`
- Create: `src/features/weibo/app/app-root.test.tsx`

- [ ] **Step 1: Write the failing query and prewarm tests**

```ts
import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'

import { emoticonConfigQueryOptions, EMOTICON_CONFIG_QUERY_KEY } from '@/features/weibo/app/emoticon-query'

describe('emoticonConfigQueryOptions', () => {
  it('uses a stable query key and infinite cache semantics', () => {
    const queryClient = new QueryClient()
    const options = emoticonConfigQueryOptions(queryClient)

    expect(EMOTICON_CONFIG_QUERY_KEY).toEqual(['weibo', 'emoticon-config'])
    expect(options.queryKey).toEqual(['weibo', 'emoticon-config'])
    expect(options.staleTime).toBe(Infinity)
    expect(options.gcTime).toBe(Infinity)
  })
})
```

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import { AppRoot } from '@/features/weibo/app/app-root'
import * as repositoryModule from '@/features/weibo/services/weibo-repository'

vi.mock('@/features/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/features/weibo/services/weibo-repository')>(
    '@/features/weibo/services/weibo-repository',
  )

  return {
    ...actual,
    loadEmoticonConfig: vi.fn(async () => ({ groups: [], phraseMap: {} })),
  }
})

describe('AppRoot', () => {
  it('prewarms emoticon config once on mount', async () => {
    render(
      <MemoryRouter>
        <AppRoot />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(vi.mocked(repositoryModule.loadEmoticonConfig)).toHaveBeenCalledTimes(1)
    })
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- src/features/weibo/app/emoticon-query.test.ts src/features/weibo/app/app-root.test.tsx`
Expected: FAIL because the shared emoticon query module and root prewarm effect do not exist yet.

- [ ] **Step 3: Write the shared query module and root prewarm**

```ts
// src/features/weibo/app/emoticon-query.ts
import {
  queryOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { loadEmoticonConfig } from '@/features/weibo/services/weibo-repository'

export const EMOTICON_CONFIG_QUERY_KEY = ['weibo', 'emoticon-config'] as const

export function emoticonConfigQueryOptions() {
  return queryOptions({
    queryKey: EMOTICON_CONFIG_QUERY_KEY,
    queryFn: loadEmoticonConfig,
    staleTime: Infinity,
    gcTime: Infinity,
  })
}

export function useEmoticonConfigQuery() {
  return useQuery(emoticonConfigQueryOptions())
}

export function usePrewarmEmoticonConfig() {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    void queryClient.ensureQueryData(emoticonConfigQueryOptions())
  }, [queryClient])
}
```

```tsx
// src/features/weibo/app/app-root.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'

import { usePrewarmEmoticonConfig } from '@/features/weibo/app/emoticon-query'
import { AppShell } from '@/features/weibo/app/app-shell'
import { WeiboHistorySync } from '@/features/weibo/app/weibo-history-sync'

function AppRootBootstrap() {
  usePrewarmEmoticonConfig()

  return (
    <BrowserRouter>
      <WeiboHistorySync />
      <Routes>
        <Route path="*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  )
}

export function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRootBootstrap />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `bun run test:unit -- src/features/weibo/app/emoticon-query.test.ts src/features/weibo/app/app-root.test.tsx`
Expected: PASS with query options proving infinite cache behavior and app root prewarming exactly one fetch.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/app/emoticon-query.ts src/features/weibo/app/emoticon-query.test.ts src/features/weibo/app/app-root.tsx src/features/weibo/app/app-root.test.tsx
git commit -m "feat: prewarm weibo emoticon config query"
```

### Task 3: Filter `url_struct` By `url_type` And Cover It In Adapter Tests

**Files:**
- Modify: `src/features/weibo/utils/transform.ts`
- Modify: `src/features/weibo/services/adapters/timeline.test.ts`
- Modify: `src/features/weibo/services/adapters/status.test.ts`

- [ ] **Step 1: Write the failing adapter tests for `url_type` filtering**

```ts
it('only maps url_struct entries with url_type to clickable links', () => {
  const result = adaptTimelineResponse({
    statuses: [
      {
        idstr: '888',
        text_raw: '看这个视频 http://t.cn/AXMyKy9F 和这段文本 http://t.cn/PLAIN',
        user: { idstr: '1', screen_name: 'Alice' },
        url_struct: [
          {
            short_url: 'http://t.cn/AXMyKy9F',
            url_title: '大米评测的微博视频',
            url_type: 39,
          },
          {
            short_url: 'http://t.cn/PLAIN',
            url_title: '普通文本',
          },
        ],
      },
    ],
  })

  expect(result.items[0]?.urlEntities).toEqual([
    {
      shortUrl: 'http://t.cn/AXMyKy9F',
      title: '大米评测的微博视频',
    },
  ])
})
```

```ts
it('does not inherit retweeted url_struct entries without url_type', () => {
  const result = adaptStatusDetailResponse({
    idstr: '501',
    text_raw: 'main',
    user: { idstr: '1', screen_name: 'Alice' },
    retweeted_status: {
      idstr: '502',
      text_raw: 'retweeted http://t.cn/PLAIN http://t.cn/LINK',
      user: { idstr: '2', screen_name: 'Bob' },
      url_struct: [
        { short_url: 'http://t.cn/PLAIN', url_title: 'plain' },
        { short_url: 'http://t.cn/LINK', url_title: 'real link', url_type: 39 },
      ],
    },
  })

  expect(result.status.retweetedStatus?.urlEntities).toEqual([
    {
      shortUrl: 'http://t.cn/LINK',
      title: 'real link',
    },
  ])
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- src/features/weibo/services/adapters/timeline.test.ts src/features/weibo/services/adapters/status.test.ts`
Expected: FAIL because `toUrlEntities()` still turns every `url_struct` item with `short_url` and `url_title` into a link.

- [ ] **Step 3: Write the minimal `url_type` filter**

```ts
// src/features/weibo/utils/transform.ts
export interface WeiboUrlStruct {
  short_url?: string
  url_title?: string
  url_type?: number | string
}

function toUrlEntities(status: WeiboStatus) {
  const text = status.text_raw ?? status.text ?? ''
  if (!text || !Array.isArray(status.url_struct)) {
    return []
  }

  return status.url_struct
    .map((entity) => {
      const shortUrl = entity.short_url?.trim() ?? ''
      const title = entity.url_title?.trim() ?? ''
      const urlType = entity.url_type

      if (!shortUrl || !title || urlType === undefined || urlType === null || urlType === '') {
        return null
      }
      if (!text.includes(shortUrl)) {
        return null
      }

      return { shortUrl, title }
    })
    .filter((entity): entity is { shortUrl: string; title: string } => entity !== null)
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `bun run test:unit -- src/features/weibo/services/adapters/timeline.test.ts src/features/weibo/services/adapters/status.test.ts`
Expected: PASS with the new `url_type` filtering behavior covered in both timeline and status detail adapters.

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/utils/transform.ts src/features/weibo/services/adapters/timeline.test.ts src/features/weibo/services/adapters/status.test.ts
git commit -m "fix: only link weibo url entities with url_type"
```

### Task 4: Render Inline Emoticons In Plain-Text Chunks

**Files:**
- Modify: `src/features/weibo/components/status-text.tsx`
- Modify: `src/features/weibo/components/status-text.test.tsx`

- [ ] **Step 1: Write the failing renderer tests**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'

import { EMOTICON_CONFIG_QUERY_KEY } from '@/features/weibo/app/emoticon-query'
import { MentionInlineText, StatusText } from '@/features/weibo/components/status-text'

function renderWithEmoticonCache(ui: React.ReactNode) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(EMOTICON_CONFIG_QUERY_KEY, {
    groups: [
      {
        title: '其他',
        items: [{ phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' }],
      },
    ],
    phraseMap: {
      '[赞]': { phrase: '[赞]', url: 'https://face.t.sinajs.cn/zan.png' },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StatusText', () => {
  it('renders matched bracket phrases as inline emoticon images', () => {
    renderWithEmoticonCache(
      <StatusText
        item={{ urlEntities: [], topicEntities: [] }}
        text="给你点个[赞]"
      />,
    )

    expect(screen.getByRole('img', { name: '[赞]' })).toHaveAttribute(
      'src',
      'https://face.t.sinajs.cn/zan.png',
    )
  })

  it('keeps unmatched bracket phrases as plain text', () => {
    renderWithEmoticonCache(
      <StatusText
        item={{ urlEntities: [], topicEntities: [] }}
        text="这个先留着[不存在]"
      />,
    )

    expect(screen.getByText('这个先留着[不存在]')).toBeInTheDocument()
  })

  it('does not turn url_struct text without url_type into links and still renders emoticons', () => {
    renderWithEmoticonCache(
      <StatusText
        item={{
          urlEntities: [{ shortUrl: 'http://t.cn/LINK', title: '真实链接' }],
          topicEntities: [],
        }}
        text="普通 http://t.cn/PLAIN [赞] 真实链接 http://t.cn/LINK"
      />,
    )

    expect(screen.queryByRole('link', { name: '普通文本' })).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: '[赞]' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '真实链接' })).toHaveAttribute('href', 'http://t.cn/LINK')
  })
})

describe('MentionInlineText', () => {
  it('renders mentions and emoticons in the same sentence', () => {
    renderWithEmoticonCache(<MentionInlineText text="@Alice [赞]" />)

    expect(screen.getByRole('link', { name: '@Alice' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '[赞]' })).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `bun run test:unit -- src/features/weibo/components/status-text.test.tsx`
Expected: FAIL because `StatusText` only renders mentions, topics, and links and does not read emoticon config from the shared query cache.

- [ ] **Step 3: Write the minimal plain-text emoticon renderer**

```tsx
// src/features/weibo/components/status-text.tsx
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { useEmoticonConfigQuery } from '@/features/weibo/app/emoticon-query'
import type { WeiboEmoticonItem } from '@/features/weibo/models/emoticon'
import { UserHoverCard } from '@/features/weibo/components/user-hover-card'
import type { FeedItem, FeedTopicEntity, FeedUrlEntity } from '@/features/weibo/models/feed'

const EMOTICON_PATTERN = /\[[^[\]]+\]/g
const INLINE_EMOTICON_CLASS_NAME = 'inline h-[1.2em] w-auto align-[-0.22em]'

function renderInlineEmoticon(emoticon: WeiboEmoticonItem, key: string) {
  return (
    <img
      key={key}
      src={emoticon.url}
      alt={emoticon.phrase}
      className={INLINE_EMOTICON_CLASS_NAME}
    />
  )
}

function renderTextWithMentionsAndEmoticons(
  text: string,
  keyPrefix: string,
  phraseMap: Record<string, WeiboEmoticonItem>,
): ReactNode {
  const parts = text.split(new RegExp(`(${MENTION_PATTERN.source}|${EMOTICON_PATTERN.source})`, 'g'))

  return parts.map((part, index) => {
    if (!part) {
      return null
    }

    const mentionMatch = part.match(new RegExp(`^${MENTION_PATTERN.source}$`))
    if (mentionMatch) {
      return renderMentionLink(mentionMatch[1] ?? '', `${keyPrefix}-mention-${index}`)
    }

    const emoticon = phraseMap[part]
    if (emoticon) {
      return renderInlineEmoticon(emoticon, `${keyPrefix}-emoticon-${index}`)
    }

    return <span key={`${keyPrefix}-text-${index}`}>{part}</span>
  })
}

export function MentionInlineText({ text }: { text: string }) {
  const emoticonQuery = useEmoticonConfigQuery()
  const phraseMap = emoticonQuery.data?.phraseMap ?? {}
  const raw = text ?? ''

  if (!raw) {
    return <>No content.</>
  }

  return (
    <span className="whitespace-pre-wrap">
      {renderTextWithMentionsAndEmoticons(raw, 'comment', phraseMap)}
    </span>
  )
}

export function StatusText({
  item,
  text,
}: {
  item: Pick<FeedItem, 'urlEntities' | 'topicEntities'>
  text: string
}) {
  const emoticonQuery = useEmoticonConfigQuery()
  const phraseMap = emoticonQuery.data?.phraseMap ?? {}
  const raw = text ?? ''

  if (!raw) {
    return <>No text content.</>
  }

  return (
    <span className="whitespace-pre-wrap">
      {renderTextWithEntities(raw, item.urlEntities ?? [], item.topicEntities ?? [], phraseMap)}
    </span>
  )
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run: `bun run test:unit -- src/features/weibo/components/status-text.test.tsx`
Expected: PASS with matched phrase, unmatched phrase, mixed mention, and plain-text chunk behavior all covered.

- [ ] **Step 5: Run the full touched test suite and commit**

Run: `bun run test:unit -- src/features/weibo/services/adapters/emoticon.test.ts src/features/weibo/app/emoticon-query.test.ts src/features/weibo/app/app-root.test.tsx src/features/weibo/services/adapters/timeline.test.ts src/features/weibo/services/adapters/status.test.ts src/features/weibo/components/status-text.test.tsx`
Expected: PASS across all emoticon and link-filtering coverage.

```bash
git add src/features/weibo/components/status-text.tsx src/features/weibo/components/status-text.test.tsx
git commit -m "feat: render weibo emoticons in status text"
```

## Self-Review

### Spec coverage

- Shared `/ajax/statuses/config` loader: Task 1
- Grouped data plus flattened phrase lookup: Task 1
- Infinite-cache global query: Task 2
- App root prewarm: Task 2
- `url_struct` `url_type` filtering: Task 3
- Inline emoticon rendering in status and comment text: Task 4
- Silent degradation to plain text on missing data or query failure: Task 4 because the renderer defaults to `phraseMap ?? {}`

### Placeholder scan

- No `TODO`, `TBD`, or “similar to” shortcuts remain.
- Every task includes concrete file paths, concrete code, exact commands, and expected outcomes.

### Type consistency

- Shared names used consistently: `WeiboEmoticonConfig`, `EMOTICON_CONFIG_QUERY_KEY`, `useEmoticonConfigQuery`, `loadEmoticonConfig`
- `url_type` is introduced once on `WeiboUrlStruct` and then referenced consistently in Task 3

