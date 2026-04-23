import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { CommentCard } from '@/lib/weibo/components/comment-card'
import type { CommentItem } from '@/lib/weibo/models/status'

vi.mock('@/lib/weibo/hooks/use-font-settings', () => ({
  useFontSettings: () => ({
    fontSizeClass: 'text-sm',
    fontFamily: '',
  }),
}))

const thumb = 'https://example.com/t.jpg'
const large = 'https://example.com/l.jpg'

describe('CommentCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      value: {
        storage: {
          local: {
            get: vi.fn(async () => ({})),
            set: vi.fn(async () => {}),
          },
        },
      },
    })
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      collapseRepliesEnabled: false,
      isHydrated: true,
    })
  })

  afterEach(() => {
    resetAppSettingsStoreForTest()
  })

  it('renders comment images once (no duplicate carousels)', () => {
    const queryClient = new QueryClient()
    const item: CommentItem = {
      id: 'c1',
      text: 'hi',
      createdAtLabel: 'now',
      author: { id: '1', name: 'A', avatarUrl: null },
      likeCount: 0,
      images: [
        { id: 'i1', thumbnailUrl: thumb, largeUrl: large },
        { id: 'i2', thumbnailUrl: thumb, largeUrl: large },
      ],
      replyComment: null,
      comments: [],
    }

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <CommentCard item={item} rootStatusId="s1" authorUid="u1" />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(container.querySelectorAll('img.aspect-square')).toHaveLength(2)
  })
})
