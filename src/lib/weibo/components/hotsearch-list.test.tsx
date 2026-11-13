import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { HotSearchCard } from '@/lib/weibo/components/hotsearch-list'
import { hotSearchQueryOptions } from '@/lib/weibo/data/weibo-data'

vi.mock('@/lib/weibo/data/weibo-data', () => ({
  hotSearchQueryOptions: vi.fn(),
}))

const hotItem = {
  type: 'hot' as const,
  word: '#测试话题#',
  num: 1,
  realpos: 1,
  labelName: '',
  icon: null,
  iconDesc: '',
  iconDescColor: '',
  topicFlag: 1,
}

function renderCard(variant: 'rail' | 'column') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  vi.mocked(hotSearchQueryOptions).mockReturnValue({
    queryKey: ['weibo', 'hotsearch', 'hot'],
    queryFn: async () => ({ items: [hotItem] }),
    staleTime: Infinity,
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HotSearchCard variant={variant} type="hot" showTypeSelector={false} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('HotSearchCard topic links', () => {
  beforeEach(() => {
    resetAppSettingsStoreForTest()
    getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    }).setState({ xbTopicPage: true, isHydrated: true })
  })

  it('opens a hot search topic inside xb from the side rail', async () => {
    renderCard('rail')

    const link = await screen.findByRole('link', { name: /测试话题/ })
    expect(link).toHaveAttribute('href', '/topic?q=%E6%B5%8B%E8%AF%95%E8%AF%9D%E9%A2%98')
    expect(link.closest('[data-slot="card"]')).toHaveClass('border', 'bg-card')
  })

  it('opens a hot search topic inside xb from a hot search column', async () => {
    renderCard('column')

    const link = await screen.findByRole('link', { name: /测试话题/ })
    expect(link).toHaveAttribute('href', '/topic?q=%E6%B5%8B%E8%AF%95%E8%AF%9D%E9%A2%98')
    expect(link.closest('[data-slot="card"]')).toBeNull()
  })

  it('opens weibo search when xb topic pages are disabled', async () => {
    getAppSettingsStore().setState({ xbTopicPage: false })
    renderCard('column')

    const link = await screen.findByRole('link', { name: /测试话题/ })
    expect(link).toHaveAttribute(
      'href',
      `https://s.weibo.com/weibo?q=${encodeURIComponent('#测试话题#')}`,
    )
    expect(link).toHaveAttribute('target', '_blank')
  })
})
