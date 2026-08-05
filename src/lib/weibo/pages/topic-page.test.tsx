import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { AppShell } from '@/lib/weibo/app/app-shell'
import { loadTopicSearch } from '@/lib/weibo/data/weibo-io'
import { TopicPage } from '@/lib/weibo/pages/topic-page'
import { MweiboCaptchaError, MweiboUnavailableError } from '@/lib/weibo/services/mweibo-errors'

vi.mock('@/lib/weibo/data/weibo-io', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-io')>(
    '@/lib/weibo/data/weibo-io',
  )

  return {
    ...actual,
    loadTopicSearch: vi.fn(),
  }
})

function renderTopicPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/topic?q=%E6%B5%8B%E8%AF%95%E8%AF%9D%E9%A2%98']}>
        <Routes>
          <Route path="*" element={<AppShell />}>
            <Route path="topic" element={<TopicPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('TopicPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(globalThis, 'browser', {
      writable: true,
      configurable: true,
      value: {
        storage: {
          local: {
            get: vi.fn(async () => ({})),
            set: vi.fn(async () => {}),
          },
        },
      },
    })
    resetAppSettingsStoreForTest()
    const store = getAppSettingsStore({
      get: async () => ({ [APP_SETTINGS_STORAGE_KEY]: undefined }),
      set: async () => {},
    })
    store.setState({
      ...store.getState(),
      rewriteEnabled: true,
      isHydrated: true,
    })
  })

  it('shows the normal empty state for a successful empty topic', async () => {
    vi.mocked(loadTopicSearch).mockResolvedValue({ items: [], nextCursor: null })

    renderTopicPage()

    expect(await screen.findByText('暂无话题内容')).toBeInTheDocument()
    expect(screen.queryByText('话题内容暂时不可用')).not.toBeInTheDocument()
  })

  it('shows the recovery prompt for non-success topic responses', async () => {
    vi.mocked(loadTopicSearch).mockRejectedValue(new MweiboUnavailableError('business'))

    renderTopicPage()

    expect(await screen.findByText('话题内容暂时不可用')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: '打开微博原话题页' })
    const url = new URL(link.getAttribute('href') ?? '')
    expect(url.searchParams.get('containerid')).toBe('231522type=1&q=#测试话题#')
    expect(screen.queryByText('暂无话题内容')).not.toBeInTheDocument()
  })

  it('keeps the dedicated captcha recovery prompt', async () => {
    vi.mocked(loadTopicSearch).mockRejectedValue(
      new MweiboCaptchaError('https://m.weibo.cn/captcha/show?backUrl='),
    )

    renderTopicPage()

    expect(await screen.findByText('需要人机验证')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '打开微博原话题页' })).toBeInTheDocument()
  })

  it('uses a friendly message for ordinary request failures', async () => {
    vi.mocked(loadTopicSearch).mockRejectedValue(new Error('mweibo-fetch-no-response'))

    renderTopicPage()

    expect(await screen.findByText('页面加载失败')).toBeInTheDocument()
    expect(screen.getByText('话题内容加载失败，请稍后重试。')).toBeInTheDocument()
    expect(screen.queryByText('mweibo-fetch-no-response')).not.toBeInTheDocument()
  })
})
