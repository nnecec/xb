# Weibo Reply And Repost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a shared comment/repost modal with emoticon picker, persisted recent emoticons, status/comment reply submission, detail refresh, toast feedback, and feed-card-to-detail navigation.

**Architecture:** Keep compose state at the shell level so feed cards, detail status cards, and the full comment tree can all open one shared modal. Isolate Weibo write APIs in the repository layer with a small typed compose model and a dedicated repost placeholder branch, then use a shell-owned mutation success callback to refetch detail queries only when the user is on a status detail page. Persist recent emoticons in a small dedicated Zustand store backed by browser storage so the picker can reuse the existing emoticon config query without overloading the app-settings domain.

**Tech Stack:** React 19, React Router 7, TanStack Query 5, Zustand, Axios, Radix UI, Vitest, Testing Library, Sonner

---

## File Structure

- `package.json`
  Add the toast dependency used by the shared modal flow.
- `bun.lock`
  Lockfile update for the new dependency.
- `src/features/weibo/models/compose.ts`
  Define the normalized compose mode, target, input, and result types shared by UI and repository code.
- `src/features/weibo/models/status.ts`
  Reuse comment model types and add lightweight aliases only when the reply-action props become too noisy for the existing comment-card signatures.
- `src/features/weibo/services/client.ts`
  Add a form-post helper that uses `URLSearchParams` and the same authenticated axios client.
- `src/features/weibo/services/endpoints.ts`
  Add write endpoint constants for comment create, comment reply, and repost placeholder routing.
- `src/features/weibo/services/weibo-repository.ts`
  Add `submitComposeAction()` and internal status/comment submission branches plus the repost placeholder.
- `src/features/weibo/services/weibo-repository.test.ts`
  Verify endpoint selection, payload encoding, and repost placeholder behavior.
- `src/features/weibo/app/recent-emoticons-store.ts`
  Persist and expose the latest 10 recently used emoticons.
- `src/features/weibo/app/recent-emoticons-store.test.ts`
  Verify hydration, deduplication, truncation, and persistence.
- `src/features/weibo/components/emoticon-picker.tsx`
  Render the dropdown-plus-tabs emoticon selector using config groups plus recent history.
- `src/features/weibo/components/emoticon-picker.test.tsx`
  Verify tab rendering, insertion callback behavior, and recent selection persistence.
- `src/features/weibo/components/comment-modal.tsx`
  Render the shared comment/repost modal with textarea, context summary, checkbox, picker, and submit lifecycle.
- `src/features/weibo/components/comment-modal.test.tsx`
  Verify mode-specific copy, checkbox labels, disabled submit state, and success/error callback wiring.
- `src/features/weibo/components/feed-card.tsx`
  Make the card surface navigate to detail while keeping actions and media non-bubbling; add colored hover treatment and repost callback support.
- `src/features/weibo/components/feed-card.test.tsx`
  Verify card navigation and action click isolation in addition to the existing long-text test.
- `src/features/weibo/components/comment-card.tsx`
  Add reply actions for top-level and nested comments and propagate normalized compose targets upward.
- `src/features/weibo/components/comment-list.tsx`
  Thread reply handlers and root status context through the full comment tree.
- `src/features/weibo/pages/status-detail-page.tsx`
  Accept the new handlers and pass the root status id into the comment tree.
- `src/features/weibo/pages/status-detail-page.test.tsx`
  Verify reply controls exist for the status and nested comments.
- `src/features/weibo/app/app-shell-panels.tsx`
  Thread card and detail action handlers through both panel surfaces.
- `src/features/weibo/app/app-shell.tsx`
  Own modal state, mutation callbacks, route-aware refetch logic, and the shared toast/mutation wiring.
- `src/features/weibo/app/app-root.tsx`
  Mount the toaster once for the whole app.
- `src/features/weibo/app/app-shell.test.tsx`
  Verify successful detail-page submissions refetch detail/comments and show toast feedback.

### Task 1: Add Compose Types, Write Endpoints, And Repository Submission Branches

**Files:**
- Create: `src/features/weibo/models/compose.ts`
- Modify: `src/features/weibo/services/client.ts`
- Modify: `src/features/weibo/services/endpoints.ts`
- Modify: `src/features/weibo/services/weibo-repository.ts`
- Modify: `src/features/weibo/services/weibo-repository.test.ts`

- [ ] **Step 1: Write the failing repository tests**

```ts
import { describe, expect, it, vi } from 'vitest'

import type { SubmitComposeInput } from '@/features/weibo/models/compose'
import { submitComposeAction } from '@/features/weibo/services/weibo-repository'
import * as client from '@/features/weibo/services/client'

vi.mock('@/features/weibo/services/client', () => ({
  fetchWeiboJson: vi.fn(),
  postWeiboForm: vi.fn(),
}))

describe('submitComposeAction', () => {
  it('posts status comments to /ajax/comments/create', async () => {
    const postWeiboForm = vi.mocked(client.postWeiboForm)
    postWeiboForm.mockResolvedValue({ ok: 1, msg: '评论成功' })

    const input: SubmitComposeInput = {
      target: {
        kind: 'status',
        mode: 'comment',
        statusId: '5286131038160528',
        targetCommentId: null,
        authorName: '雷军',
        excerpt: '车载相机上线之后',
      },
      text: '太酷了[色]',
      alsoSecondaryAction: true,
    }

    await submitComposeAction(input)

    expect(postWeiboForm).toHaveBeenCalledWith('/ajax/comments/create', {
      id: '5286131038160528',
      comment: '太酷了[色]',
      pic_id: '',
      is_repost: '1',
      comment_ori: '0',
      is_comment: '0',
    })
  })

  it('posts comment replies to /ajax/comments/reply', async () => {
    const postWeiboForm = vi.mocked(client.postWeiboForm)
    postWeiboForm.mockResolvedValue({ ok: 1, msg: '回复评论成功' })

    await submitComposeAction({
      target: {
        kind: 'comment',
        mode: 'comment',
        statusId: '5286131038160528',
        targetCommentId: '5286139894171523',
        authorName: 'foccia',
        excerpt: '太酷了[色]',
      },
      text: '[手指比心]',
      alsoSecondaryAction: false,
    })

    expect(postWeiboForm).toHaveBeenCalledWith('/ajax/comments/reply', {
      id: '5286131038160528',
      cid: '5286139894171523',
      comment: '[手指比心]',
      pic_id: '',
      is_repost: '0',
      comment_ori: '0',
      is_comment: '0',
    })
  })

  it('throws a clear placeholder error for repost mode', async () => {
    await expect(
      submitComposeAction({
        target: {
          kind: 'status',
          mode: 'repost',
          statusId: '5286131038160528',
          targetCommentId: null,
          authorName: '雷军',
          excerpt: '车载相机上线之后',
        },
        text: '转一下',
        alsoSecondaryAction: true,
      }),
    ).rejects.toThrow('weibo-repost-endpoint-not-configured')
  })
})
```

- [ ] **Step 2: Run the repository test to verify it fails**

Run: `bun run test:unit -- src/features/weibo/services/weibo-repository.test.ts`
Expected: FAIL because `postWeiboForm`, `SubmitComposeInput`, and `submitComposeAction` do not exist yet.

- [ ] **Step 3: Add the compose model and form-post client helper**

```ts
// src/features/weibo/models/compose.ts
export type ComposeMode = 'comment' | 'repost'

export type ComposeTarget =
  | {
      kind: 'status'
      mode: ComposeMode
      statusId: string
      targetCommentId: null
      authorName: string
      excerpt: string
    }
  | {
      kind: 'comment'
      mode: ComposeMode
      statusId: string
      targetCommentId: string
      authorName: string
      excerpt: string
    }

export interface SubmitComposeInput {
  target: ComposeTarget
  text: string
  alsoSecondaryAction: boolean
}
```

```ts
// src/features/weibo/services/client.ts
export async function postWeiboForm<T>(
  path: string,
  data: Record<string, string>,
): Promise<T> {
  try {
    const response = await weiboClient.post<T>(
      path,
      new URLSearchParams(data),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    )

    return response.data
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status
      if (status) {
        throw new Error(`weibo-request-failed:${status}`)
      }
    }

    throw error
  }
}
```

- [ ] **Step 4: Add endpoints and minimal repository implementation**

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
  commentCreate: '/ajax/comments/create',
  commentReply: '/ajax/comments/reply',
  profileInfo: '/ajax/profile/info',
  profileDetail: '/ajax/profile/detail',
  profilePosts: '/ajax/statuses/mymblog',
} as const
```

```ts
// src/features/weibo/services/weibo-repository.ts
import type { SubmitComposeInput } from '@/features/weibo/models/compose'
import { postWeiboForm } from '@/features/weibo/services/client'

interface WeiboMutationResponse {
  ok?: number
  msg?: string
}

function buildCommentPayload(input: SubmitComposeInput) {
  const base = {
    id: input.target.statusId,
    comment: input.text,
    pic_id: '',
    is_repost: input.alsoSecondaryAction ? '1' : '0',
    comment_ori: '0',
    is_comment: '0',
  }

  if (input.target.kind === 'comment') {
    return {
      path: WEIBO_ENDPOINTS.commentReply,
      data: {
        ...base,
        cid: input.target.targetCommentId,
      },
    }
  }

  return {
    path: WEIBO_ENDPOINTS.commentCreate,
    data: base,
  }
}

async function submitStatusRepost(_input: SubmitComposeInput): Promise<void> {
  throw new Error('weibo-repost-endpoint-not-configured')
}

export async function submitComposeAction(input: SubmitComposeInput): Promise<void> {
  if (input.target.mode === 'repost') {
    await submitStatusRepost(input)
    return
  }

  const { path, data } = buildCommentPayload(input)
  const response = await postWeiboForm<WeiboMutationResponse>(path, data)

  if (response.ok !== 1) {
    throw new Error(response.msg || 'weibo-compose-failed')
  }
}
```

- [ ] **Step 5: Run the repository test to verify it passes**

Run: `bun run test:unit -- src/features/weibo/services/weibo-repository.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/weibo/models/compose.ts src/features/weibo/services/client.ts src/features/weibo/services/endpoints.ts src/features/weibo/services/weibo-repository.ts src/features/weibo/services/weibo-repository.test.ts
git commit -m "feat: add weibo compose submission repository"
```

### Task 2: Add Persisted Recent Emoticons Store

**Files:**
- Create: `src/features/weibo/app/recent-emoticons-store.ts`
- Create: `src/features/weibo/app/recent-emoticons-store.test.ts`

- [ ] **Step 1: Write the failing store test**

```ts
import { beforeEach, describe, expect, it } from 'vitest'

import {
  createRecentEmoticonsStore,
  RECENT_EMOTICONS_STORAGE_KEY,
} from '@/features/weibo/app/recent-emoticons-store'

function createStorageArea(initialValue?: unknown) {
  let stored = initialValue

  return {
    get: async () => ({ [RECENT_EMOTICONS_STORAGE_KEY]: stored }),
    set: async (items: Record<string, unknown>) => {
      stored = items[RECENT_EMOTICONS_STORAGE_KEY]
    },
    read: () => stored,
  }
}

describe('recent-emoticons-store', () => {
  beforeEach(() => {})

  it('hydrates and keeps the latest 10 unique emoticons', async () => {
    const storage = createStorageArea([{ phrase: '[赞]', url: 'https://face/zan.png' }])
    const store = createRecentEmoticonsStore(storage)

    await store.getState().hydrate()
    store.getState().remember({ phrase: '[色]', url: 'https://face/se.png' })
    store.getState().remember({ phrase: '[赞]', url: 'https://face/zan-new.png' })

    expect(store.getState().items).toEqual([
      { phrase: '[赞]', url: 'https://face/zan-new.png' },
      { phrase: '[色]', url: 'https://face/se.png' },
    ])

    for (let index = 0; index < 12; index += 1) {
      store.getState().remember({ phrase: `[${index}]`, url: `https://face/${index}.png` })
    }

    expect(store.getState().items).toHaveLength(10)
    expect(storage.read()).toHaveLength(10)
  })
})
```

- [ ] **Step 2: Run the store test to verify it fails**

Run: `bun run test:unit -- src/features/weibo/app/recent-emoticons-store.test.ts`
Expected: FAIL because the store module does not exist yet.

- [ ] **Step 3: Implement the persisted recent-emoticons store**

```ts
// src/features/weibo/app/recent-emoticons-store.ts
import { createStore, type StoreApi } from 'zustand/vanilla'
import { useStore } from 'zustand'

import type { AppSettingsStorageArea } from '@/lib/app-settings'

export interface RecentEmoticonEntry {
  phrase: string
  url: string
}

export const RECENT_EMOTICONS_STORAGE_KEY = 'xb:weibo-recent-emoticons'

interface RecentEmoticonsState {
  isHydrated: boolean
  items: RecentEmoticonEntry[]
  hydrate: () => Promise<void>
  remember: (entry: RecentEmoticonEntry) => Promise<void>
}

function normalizeRecentEntries(value: unknown): RecentEmoticonEntry[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is RecentEmoticonEntry => {
      return Boolean(
        item &&
          typeof item === 'object' &&
          typeof (item as RecentEmoticonEntry).phrase === 'string' &&
          typeof (item as RecentEmoticonEntry).url === 'string',
      )
    })
    .slice(0, 10)
}

export function createRecentEmoticonsStore(
  storageArea: AppSettingsStorageArea = browser.storage.local,
): StoreApi<RecentEmoticonsState> {
  return createStore<RecentEmoticonsState>((set, get) => ({
    isHydrated: false,
    items: [],
    async hydrate() {
      const stored = await storageArea.get(RECENT_EMOTICONS_STORAGE_KEY)
      set({
        isHydrated: true,
        items: normalizeRecentEntries(stored[RECENT_EMOTICONS_STORAGE_KEY]),
      })
    },
    async remember(entry) {
      const nextItems = [
        entry,
        ...get().items.filter((item) => item.phrase !== entry.phrase),
      ].slice(0, 10)

      set({ items: nextItems })
      await storageArea.set({
        [RECENT_EMOTICONS_STORAGE_KEY]: nextItems,
      })
    },
  }))
}

let recentEmoticonsStore: StoreApi<RecentEmoticonsState> | null = null

export function getRecentEmoticonsStore(storageArea?: AppSettingsStorageArea) {
  if (!recentEmoticonsStore) {
    recentEmoticonsStore = createRecentEmoticonsStore(storageArea)
  }

  return recentEmoticonsStore
}

export function useRecentEmoticons<T>(selector: (state: RecentEmoticonsState) => T): T {
  return useStore(getRecentEmoticonsStore(), selector)
}
```

- [ ] **Step 4: Run the store test to verify it passes**

Run: `bun run test:unit -- src/features/weibo/app/recent-emoticons-store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/app/recent-emoticons-store.ts src/features/weibo/app/recent-emoticons-store.test.ts
git commit -m "feat: persist recent weibo emoticons"
```

### Task 3: Build The Emoticon Picker And Shared Comment Modal

**Files:**
- Create: `src/features/weibo/components/emoticon-picker.tsx`
- Create: `src/features/weibo/components/emoticon-picker.test.tsx`
- Create: `src/features/weibo/components/comment-modal.tsx`
- Create: `src/features/weibo/components/comment-modal.test.tsx`
- Modify: `package.json`
- Modify: `bun.lock`

- [ ] **Step 1: Add the toast dependency and write the failing modal tests**

```ts
// package.json
{
  "dependencies": {
    "sonner": "^2.0.3"
  }
}
```

```ts
// src/features/weibo/components/comment-modal.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CommentModal } from '@/features/weibo/components/comment-modal'

describe('CommentModal', () => {
  it('renders repost toggle copy for comment mode', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CommentModal
          open
          isSubmitting={false}
          onOpenChange={() => {}}
          onSubmit={vi.fn()}
          target={{
            kind: 'comment',
            mode: 'comment',
            statusId: '1',
            targetCommentId: '2',
            authorName: 'Alice',
            excerpt: 'hello',
          }}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: '回复评论' })).toBeInTheDocument()
    expect(screen.getByLabelText('同时转发')).toBeInTheDocument()
  })

  it('renders reply toggle copy for repost mode', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <CommentModal
          open
          isSubmitting={false}
          onOpenChange={() => {}}
          onSubmit={vi.fn()}
          target={{
            kind: 'status',
            mode: 'repost',
            statusId: '1',
            targetCommentId: null,
            authorName: 'Alice',
            excerpt: 'hello',
          }}
        />
      </QueryClientProvider>,
    )

    expect(screen.getByRole('heading', { name: '转发微博' })).toBeInTheDocument()
    expect(screen.getByLabelText('同时回复')).toBeInTheDocument()
  })

  it('passes textarea text and secondary toggle state on submit', () => {
    const onSubmit = vi.fn()

    render(
      <QueryClientProvider client={new QueryClient()}>
        <CommentModal
          open
          isSubmitting={false}
          onOpenChange={() => {}}
          onSubmit={onSubmit}
          target={{
            kind: 'status',
            mode: 'comment',
            statusId: '1',
            targetCommentId: null,
            authorName: 'Alice',
            excerpt: 'hello',
          }}
        />
      </QueryClientProvider>,
    )

    fireEvent.change(screen.getByRole('textbox', { name: '回复内容' }), {
      target: { value: '太酷了[色]' },
    })
    fireEvent.click(screen.getByLabelText('同时转发'))
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    expect(onSubmit).toHaveBeenCalledWith({
      text: '太酷了[色]',
      alsoSecondaryAction: true,
    })
  })
})
```

- [ ] **Step 2: Install dependencies and run the modal test to verify it fails**

Run: `bun install && bun run test:unit -- src/features/weibo/components/comment-modal.test.tsx`
Expected: FAIL because the modal and picker components do not exist yet.

- [ ] **Step 3: Build the emoticon picker**

```tsx
// src/features/weibo/components/emoticon-picker.tsx
import { Smile } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useEmoticonConfigQuery } from '@/features/weibo/app/emoticon-query'
import { useRecentEmoticons } from '@/features/weibo/app/recent-emoticons-store'

export function EmoticonPicker({
  onSelect,
}: {
  onSelect: (entry: { phrase: string; url: string }) => void
}) {
  const { data } = useEmoticonConfigQuery()
  const recentItems = useRecentEmoticons((state) => state.items)
  const remember = useRecentEmoticons((state) => state.remember)
  const groups = [{ title: '最近', items: recentItems }, ...(data?.groups ?? [])]
  const defaultTab = groups[0]?.title ?? '最近'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          <Smile className="size-4" />
          表情
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[320px] p-3">
        <Tabs defaultValue={defaultTab}>
          <TabsList className="mb-3 flex w-full overflow-x-auto">
            {groups.map((group) => (
              <TabsTrigger key={group.title} value={group.title}>
                {group.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((group) => (
            <TabsContent key={group.title} value={group.title}>
              <div className="grid max-h-56 grid-cols-6 gap-2 overflow-y-auto">
                {group.items.map((item) => (
                  <button
                    key={`${group.title}-${item.phrase}`}
                    type="button"
                    className="flex flex-col items-center gap-1 rounded-lg p-2 hover:bg-muted"
                    onClick={() => {
                      void remember(item)
                      onSelect(item)
                    }}
                  >
                    <img alt={item.phrase} className="size-7" src={item.url} />
                    <span className="text-[10px] leading-4">{item.phrase}</span>
                  </button>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

- [ ] **Step 4: Build the shared comment modal**

```tsx
// src/features/weibo/components/comment-modal.tsx
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ComposeTarget } from '@/features/weibo/models/compose'

import { EmoticonPicker } from './emoticon-picker'

function getModalCopy(target: ComposeTarget) {
  if (target.mode === 'repost') {
    return {
      title: '转发微博',
      checkbox: '同时回复',
      submit: '转发',
    }
  }

  return {
    title: target.kind === 'status' ? '回复微博' : '回复评论',
    checkbox: '同时转发',
    submit: '发送',
  }
}

export function CommentModal({
  open,
  target,
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  target: ComposeTarget | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { text: string; alsoSecondaryAction: boolean }) => void
}) {
  const [text, setText] = useState('')
  const [alsoSecondaryAction, setAlsoSecondaryAction] = useState(false)

  useEffect(() => {
    if (!open) {
      setText('')
      setAlsoSecondaryAction(false)
    }
  }, [open, target])

  if (!target) {
    return null
  }

  const copy = getModalCopy(target)
  const isSubmitDisabled = isSubmitting || text.trim().length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            @{target.authorName} · {target.excerpt || '没有可预览的内容'}
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">回复内容</span>
          <textarea
            aria-label="回复内容"
            autoFocus
            className="min-h-32 rounded-xl border bg-background px-3 py-2 text-sm outline-none"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <EmoticonPicker onSelect={(item) => setText((value) => `${value}${item.phrase}`)} />
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={alsoSecondaryAction}
              type="checkbox"
              onChange={(event) => setAlsoSecondaryAction(event.target.checked)}
            />
            {copy.checkbox}
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            disabled={isSubmitDisabled}
            onClick={() => onSubmit({ text, alsoSecondaryAction })}
          >
            {isSubmitting ? '发送中...' : copy.submit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: Run the new component tests to verify they pass**

Run: `bun run test:unit -- src/features/weibo/components/comment-modal.test.tsx src/features/weibo/components/emoticon-picker.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add package.json bun.lock src/features/weibo/components/emoticon-picker.tsx src/features/weibo/components/emoticon-picker.test.tsx src/features/weibo/components/comment-modal.tsx src/features/weibo/components/comment-modal.test.tsx
git commit -m "feat: add weibo comment modal and emoticon picker"
```

### Task 4: Wire Shared Modal State, Toasts, And Detail Refresh In The Shell

**Files:**
- Modify: `src/features/weibo/app/app-root.tsx`
- Modify: `src/features/weibo/app/app-shell.tsx`
- Modify: `src/features/weibo/app/app-shell-panels.tsx`
- Modify: `src/features/weibo/app/app-shell.test.tsx`

- [ ] **Step 1: Write the failing shell behavior test**

```ts
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppShell } from '@/features/weibo/app/app-shell'
import * as repository from '@/features/weibo/services/weibo-repository'

vi.mock('@/features/weibo/services/weibo-repository')

describe('AppShell compose flow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refetches detail queries after a successful status-detail reply', async () => {
    vi.mocked(repository.loadStatusDetail).mockResolvedValue({
      status: {
        id: '501',
        mblogId: '501',
        isLongText: false,
        text: 'main post',
        createdAtLabel: 'today',
        author: { id: '1', name: 'Alice', avatarUrl: null },
        stats: { likes: 1, comments: 1, reposts: 0 },
        images: [],
        media: null,
        regionName: '',
        source: '',
      },
    })
    vi.mocked(repository.loadStatusComments).mockResolvedValue({
      items: [],
      nextCursor: null,
    })
    vi.mocked(repository.submitComposeAction).mockResolvedValue()

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/1/501']}>
          <AppShell />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    await screen.findByText('main post')
    fireEvent.click(screen.getByRole('button', { name: '回复微博' }))
    fireEvent.change(screen.getByRole('textbox', { name: '回复内容' }), {
      target: { value: '太酷了[色]' },
    })
    fireEvent.click(screen.getByRole('button', { name: '发送' }))

    await waitFor(() => {
      expect(repository.submitComposeAction).toHaveBeenCalled()
    })

    await waitFor(() => {
      expect(repository.loadStatusDetail).toHaveBeenCalledTimes(2)
      expect(repository.loadStatusComments).toHaveBeenCalledTimes(2)
    })
  })
})
```

- [ ] **Step 2: Run the shell test to verify it fails**

Run: `bun run test:unit -- src/features/weibo/app/app-shell.test.tsx`
Expected: FAIL because shell-level compose state and submit wiring do not exist yet.

- [ ] **Step 3: Mount the toaster and add shell-owned compose state**

```tsx
// src/features/weibo/app/app-root.tsx
import { Toaster } from 'sonner'

export function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRootBootstrap />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  )
}
```

```tsx
// src/features/weibo/app/app-shell.tsx
import { useState } from 'react'
import { toast } from 'sonner'

import { CommentModal } from '@/features/weibo/components/comment-modal'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import { submitComposeAction } from '@/features/weibo/services/weibo-repository'

const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null)
const [isComposeSubmitting, setIsComposeSubmitting] = useState(false)

async function handleComposeSubmit(payload: {
  text: string
  alsoSecondaryAction: boolean
}) {
  if (!composeTarget) return

  setIsComposeSubmitting(true)

  try {
    await submitComposeAction({
      target: composeTarget,
      text: payload.text,
      alsoSecondaryAction: payload.alsoSecondaryAction,
    })

    if (page.kind === 'status') {
      await Promise.all([
        statusDetailQuery.refetch(),
        statusCommentsQuery.refetch(),
      ])
    }

    toast.success(composeTarget.mode === 'repost' ? '转发成功' : '回复成功')
    setComposeTarget(null)
  } catch (error) {
    toast.error(error instanceof Error ? error.message : '发送失败，请稍后重试')
  } finally {
    setIsComposeSubmitting(false)
  }
}
```

- [ ] **Step 4: Pass modal handlers through the shell panel tree**

```tsx
// src/features/weibo/app/app-shell-panels.tsx
onStatusComment: (target: ComposeTarget) => void
onStatusRepost: (target: ComposeTarget) => void
onCommentReply: (target: ComposeTarget) => void

<StatusDetailPage
  detail={statusDetail}
  comments={statusComments}
  onStatusComment={onStatusComment}
  onStatusRepost={onStatusRepost}
  onCommentReply={onCommentReply}
  hasNextPage={statusCommentsHasNextPage}
  isFetchingNextPage={statusCommentsIsFetchingNextPage}
  onLoadNextPage={onLoadNextComments}
/>;
```

```tsx
// src/features/weibo/app/app-shell.tsx
<HomeStatusPanels
  activeTimelineTab={activeTimelineTab}
  isHomePageVisible={page.kind === 'home'}
  isStatusPageVisible={page.kind === 'status'}
  timelineErrorMessage={
    timelineQuery.error instanceof Error ? timelineQuery.error.message : null
  }
  timelineHasNextPage={Boolean(timelineQuery.hasNextPage)}
  timelineIsFetchingNextPage={timelineQuery.isFetchingNextPage}
  timelineIsLoading={timelineQuery.isLoading}
  timelineItems={timelineItems}
  statusComments={statusComments}
  statusCommentsHasNextPage={Boolean(statusCommentsQuery.hasNextPage)}
  statusCommentsIsFetchingNextPage={statusCommentsQuery.isFetchingNextPage}
  statusDetail={statusDetailQuery.data}
  statusDetailErrorMessage={
    statusDetailQuery.error instanceof Error ? statusDetailQuery.error.message : null
  }
  statusDetailIsLoading={statusDetailQuery.isLoading}
  onStatusComment={setComposeTarget}
  onStatusRepost={setComposeTarget}
  onCommentReply={setComposeTarget}
  onCommentClick={navigateToStatusDetail}
  onHomeRetry={() => void timelineQuery.refetch()}
  onHomeTabChange={(tab) => navigate(getHomeTimelinePath(tab))}
  onLoadNextComments={() => void statusCommentsQuery.fetchNextPage()}
  onLoadNextTimeline={() => void timelineQuery.fetchNextPage()}
/>

<CommentModal
  open={composeTarget !== null}
  target={composeTarget}
  isSubmitting={isComposeSubmitting}
  onOpenChange={(open) => {
    if (!open) setComposeTarget(null)
  }}
  onSubmit={handleComposeSubmit}
/>
```

- [ ] **Step 5: Run the shell test to verify it passes**

Run: `bun run test:unit -- src/features/weibo/app/app-shell.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/weibo/app/app-root.tsx src/features/weibo/app/app-shell.tsx src/features/weibo/app/app-shell-panels.tsx src/features/weibo/app/app-shell.test.tsx
git commit -m "feat: wire shared compose modal through weibo shell"
```

### Task 5: Update Feed Cards For Detail Navigation And Colored Action Hovers

**Files:**
- Modify: `src/features/weibo/components/feed-card.tsx`
- Modify: `src/features/weibo/components/feed-card.test.tsx`

- [ ] **Step 1: Extend the feed-card test with navigation and propagation coverage**

```ts
it('navigates to detail when clicking the card body but not action buttons', async () => {
  const queryClient = new QueryClient()
  const onNavigate = vi.fn()
  const onComment = vi.fn()
  const onRepost = vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <FeedCard
          item={{
            id: '501',
            mblogId: 'm501',
            isLongText: false,
            text: 'preview content',
            createdAtLabel: 'today',
            author: { id: '1', name: 'Alice', avatarUrl: null },
            stats: { likes: 1, comments: 2, reposts: 3 },
            images: [],
            media: null,
            regionName: '',
            source: '',
          }}
          onNavigate={onNavigate}
          onCommentClick={onComment}
          onRepostClick={onRepost}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  fireEvent.click(screen.getByTestId('feed-card-body'))
  expect(onNavigate).toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: /2/ }))
  expect(onComment).toHaveBeenCalled()
  expect(onNavigate).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: Run the feed-card test to verify it fails**

Run: `bun run test:unit -- src/features/weibo/components/feed-card.test.tsx`
Expected: FAIL because the card body target, repost callback, and hover classes do not exist yet.

- [ ] **Step 3: Update the feed card surface and reusable actions**

```tsx
// src/features/weibo/components/feed-card.tsx
function FeedActions({
  item,
  onCommentClick,
  onRepostClick,
}: {
  item: FeedItem
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
      <button
        type="button"
        className="group flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 transition-colors hover:bg-sky-50 hover:text-sky-600"
        onClick={(event) => {
          event.stopPropagation()
          onCommentClick?.(item)
        }}
      >
        <MessageCircle className="size-3.5 transition-colors group-hover:text-sky-500" />
        <span>{formatCount(item.stats.comments)}</span>
      </button>
      <button
        type="button"
        className="group flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 transition-colors hover:bg-emerald-50 hover:text-emerald-600"
        onClick={(event) => {
          event.stopPropagation()
          onRepostClick?.(item)
        }}
      >
        <Repeat2 className="size-3.5 transition-colors group-hover:text-emerald-500" />
        <span>{formatCount(item.stats.reposts)}</span>
      </button>
      <button
        type="button"
        className="group flex items-center justify-center gap-1 rounded-full bg-muted px-3 py-2 transition-colors hover:bg-rose-50 hover:text-rose-600"
        onClick={(event) => event.stopPropagation()}
      >
        <Heart className="size-3.5 transition-colors group-hover:text-rose-500" />
        <span>{formatCount(item.stats.likes)}</span>
      </button>
    </div>
  )
}
```

```tsx
export function FeedCard({
  item,
  onNavigate,
  onCommentClick,
  onRepostClick,
}: {
  item: FeedItem
  onNavigate?: (item: FeedItem) => void
  onCommentClick?: (item: FeedItem) => void
  onRepostClick?: (item: FeedItem) => void
}) {
  return (
    <Card
      className="gap-4 rounded-[28px] border-border/70 bg-card/95 py-4 shadow-none cursor-pointer"
      data-testid="feed-card-body"
      onClick={() => onNavigate?.(item)}
    >
      <FeedAuthorHeader item={item} />
      <CardContent className="flex flex-col gap-4 px-4">
        <FeedTextBlock
          item={item}
          text={resolvedText}
          canLoadLongText={shouldShowLoadLongText}
          isLongTextLoading={isLongTextLoading}
          hasLongTextError={hasLongTextError}
          onLoadLongText={onLoadLongText}
        />
        <FeedMediaBlock item={item} />
        <ImageGrid
          images={item.images}
          onImageClick={(index) => {
            openImageDialog(null, index)
          }}
        />
        {item.retweetedStatus ? (
          <RetweetedFeedBlock
            item={item.retweetedStatus}
            onImageClick={(images, index) => {
              openImageDialog(images, index)
            }}
          />
        ) : null}
        <FeedActions item={item} onCommentClick={onCommentClick} onRepostClick={onRepostClick} />
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Run the feed-card test to verify it passes**

Run: `bun run test:unit -- src/features/weibo/components/feed-card.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/components/feed-card.tsx src/features/weibo/components/feed-card.test.tsx
git commit -m "feat: navigate weibo cards and color action hovers"
```

### Task 6: Add Status And Comment Reply Entry Points Across The Detail Page

**Files:**
- Modify: `src/features/weibo/pages/status-detail-page.tsx`
- Modify: `src/features/weibo/pages/status-detail-page.test.tsx`
- Modify: `src/features/weibo/components/comment-list.tsx`
- Modify: `src/features/weibo/components/comment-card.tsx`

- [ ] **Step 1: Write the failing detail-page interaction test**

```ts
it('exposes reply controls for the status and nested comments', () => {
  const onStatusComment = vi.fn()
  const onStatusRepost = vi.fn()
  const onCommentReply = vi.fn()

  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <StatusDetailPage
          detail={{
            status: {
              id: '501',
              isLongText: false,
              mblogId: null,
              text: 'main post',
              createdAtLabel: 'today',
              author: { id: '1', name: 'Alice', avatarUrl: null },
              stats: { likes: 1, comments: 1, reposts: 0 },
              images: [],
              media: null,
              regionName: '',
              source: '',
            },
          }}
          comments={[
            {
              id: '601',
              text: 'reply',
              createdAtLabel: 'today',
              author: { id: '2', name: 'Bob', avatarUrl: null },
              likeCount: 0,
              source: '来自江苏',
              images: [],
              replyComment: null,
              comments: [
                {
                  id: '602',
                  text: 'nested reply',
                  createdAtLabel: 'today',
                  author: { id: '3', name: 'Carol', avatarUrl: null },
                  likeCount: 0,
                  source: '',
                  images: [],
                  replyComment: null,
                  comments: [],
                },
              ],
            },
          ]}
          hasNextPage={false}
          isFetchingNextPage={false}
          onLoadNextPage={() => {}}
          onStatusComment={onStatusComment}
          onStatusRepost={onStatusRepost}
          onCommentReply={onCommentReply}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  expect(screen.getByRole('button', { name: '回复微博' })).toBeInTheDocument()
  expect(screen.getAllByRole('button', { name: '回复评论' }).length).toBeGreaterThan(1)
})
```

- [ ] **Step 2: Run the detail-page test to verify it fails**

Run: `bun run test:unit -- src/features/weibo/pages/status-detail-page.test.tsx`
Expected: FAIL because the status page and comment cards do not expose reply handlers yet.

- [ ] **Step 3: Thread reply targets through status detail and comment tree**

```tsx
// src/features/weibo/pages/status-detail-page.tsx
import type { ComposeTarget } from '@/features/weibo/models/compose'

<FeedCard
  item={detail.status}
  onCommentClick={() =>
    onStatusComment({
      kind: 'status',
      mode: 'comment',
      statusId: detail.status.id,
      targetCommentId: null,
      authorName: detail.status.author.name,
      excerpt: detail.status.text,
    })}
  onRepostClick={() =>
    onStatusRepost({
      kind: 'status',
      mode: 'repost',
      statusId: detail.status.id,
      targetCommentId: null,
      authorName: detail.status.author.name,
      excerpt: detail.status.text,
    })}
/>

<CommentList
  comments={comments}
  rootStatusId={detail.status.id}
  onReply={onCommentReply}
  emptyLabel="No replies are available for this post yet."
/>
```

```tsx
// src/features/weibo/components/comment-card.tsx
function toCommentReplyTarget(rootStatusId: string, comment: CommentItem): ComposeTarget {
  return {
    kind: 'comment',
    mode: 'comment',
    statusId: rootStatusId,
    targetCommentId: comment.id,
    authorName: comment.author.name,
    excerpt: comment.text,
  }
}

<button
  type="button"
  className="text-xs text-sky-600 hover:underline"
  onClick={() => onReply(toCommentReplyTarget(rootStatusId, item))}
>
  回复评论
</button>
```

- [ ] **Step 4: Run the detail-page and comment tests to verify they pass**

Run: `bun run test:unit -- src/features/weibo/pages/status-detail-page.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/features/weibo/pages/status-detail-page.tsx src/features/weibo/pages/status-detail-page.test.tsx src/features/weibo/components/comment-list.tsx src/features/weibo/components/comment-card.tsx
git commit -m "feat: add reply entry points across weibo detail comments"
```

### Task 7: Final Integration Pass For Picker Persistence, Toast Copy, And End-to-End Regression Tests

**Files:**
- Modify: `src/features/weibo/components/comment-modal.tsx`
- Modify: `src/features/weibo/components/emoticon-picker.tsx`
- Modify: `src/features/weibo/app/app-shell.test.tsx`
- Modify: `src/features/weibo/components/comment-modal.test.tsx`
- Modify: `src/features/weibo/components/emoticon-picker.test.tsx`

- [ ] **Step 1: Write the failing integration assertions**

```ts
it('shows success toast copy after a comment submission', async () => {
  vi.mocked(repository.submitComposeAction).mockResolvedValue()
  vi.mocked(repository.loadStatusDetail).mockResolvedValue({
    status: {
      id: '501',
      mblogId: '501',
      isLongText: false,
      text: 'main post',
      createdAtLabel: 'today',
      author: { id: '1', name: 'Alice', avatarUrl: null },
      stats: { likes: 1, comments: 1, reposts: 0 },
      images: [],
      media: null,
      regionName: '',
      source: '',
    },
  })
  vi.mocked(repository.loadStatusComments).mockResolvedValue({
    items: [],
    nextCursor: null,
  })

  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/1/501']}>
        <AppShell />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  await screen.findByText('main post')
  fireEvent.click(screen.getByRole('button', { name: '回复微博' }))
  fireEvent.change(screen.getByRole('textbox', { name: '回复内容' }), {
    target: { value: '太酷了[色]' },
  })
  fireEvent.click(screen.getByRole('button', { name: '发送' }))

  await screen.findByText('回复成功')
})

it('remembers the latest 10 picked emoticons', async () => {
  const queryClient = new QueryClient()
  queryClient.setQueryData(['weibo', 'emoticon-config'], {
    groups: [
      {
        title: '默认',
        items: [{ phrase: '[色]', url: 'https://face.t.sinajs.cn/se.png' }],
      },
    ],
    phraseMap: {
      '[色]': { phrase: '[色]', url: 'https://face.t.sinajs.cn/se.png' },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <EmoticonPicker onSelect={() => {}} />
    </QueryClientProvider>,
  )
  fireEvent.click(screen.getByRole('button', { name: '表情' }))
  fireEvent.click(screen.getByRole('button', { name: '[色] [色]' }))

  expect(store.getState().items[0]).toEqual({
    phrase: '[色]',
    url: 'https://face.t.sinajs.cn/se.png',
  })
})
```

- [ ] **Step 2: Run the focused integration tests to verify they fail**

Run: `bun run test:unit -- src/features/weibo/app/app-shell.test.tsx src/features/weibo/components/comment-modal.test.tsx src/features/weibo/components/emoticon-picker.test.tsx`
Expected: FAIL until the last copy, hydration, and callback gaps are closed.

- [ ] **Step 3: Close the remaining UX gaps**

```tsx
// src/features/weibo/components/comment-modal.tsx
const copy = getModalCopy(target)
const isTextRequired = true
const isSubmitDisabled = isSubmitting || (isTextRequired && text.trim().length === 0)
```

```tsx
// src/features/weibo/components/emoticon-picker.tsx
const isHydrated = useRecentEmoticons((state) => state.isHydrated)

useEffect(() => {
  if (!isHydrated) {
    void getRecentEmoticonsStore().getState().hydrate()
  }
}, [isHydrated])
```

```ts
// src/features/weibo/app/app-shell.test.tsx
expect(await screen.findByText('回复成功')).toBeInTheDocument()
expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
```

- [ ] **Step 4: Run the full targeted test set**

Run: `bun run test:unit -- src/features/weibo/services/weibo-repository.test.ts src/features/weibo/app/recent-emoticons-store.test.ts src/features/weibo/components/emoticon-picker.test.tsx src/features/weibo/components/comment-modal.test.tsx src/features/weibo/components/feed-card.test.tsx src/features/weibo/pages/status-detail-page.test.tsx src/features/weibo/app/app-shell.test.tsx`
Expected: PASS

- [ ] **Step 5: Run a compile check**

Run: `bun run compile`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/features/weibo/components/comment-modal.tsx src/features/weibo/components/emoticon-picker.tsx src/features/weibo/app/app-shell.test.tsx src/features/weibo/components/comment-modal.test.tsx src/features/weibo/components/emoticon-picker.test.tsx
git commit -m "test: finalize weibo compose flow coverage"
```
