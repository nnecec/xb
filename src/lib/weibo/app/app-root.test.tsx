import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppRoot } from '@/lib/weibo/app/app-root'
import * as repositoryModule from '@/lib/weibo/services/weibo-repository'

vi.mock('@/lib/weibo/app/app-shell', () => ({
  AppShell: () => <div>app-shell</div>,
}))

vi.mock('@/lib/weibo/app/weibo-history-sync', () => ({
  WeiboHistorySync: () => null,
}))

vi.mock('@/lib/weibo/app/error-boundary', () => ({
  AppErrorBoundary: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/lib/weibo/services/weibo-repository', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/services/weibo-repository')>(
    '@/lib/weibo/services/weibo-repository',
  )

  return {
    ...actual,
    loadEmoticonConfig: vi.fn(async () => ({ groups: [], phraseMap: {} })),
  }
})

describe('AppRoot', () => {
  it('prewarms emoticon config once on mount', async () => {
    const queryClient = new QueryClient()

    render(
      <QueryClientProvider client={queryClient}>
        <AppRoot />
      </QueryClientProvider>,
    )

    await waitFor(() => {
      expect(vi.mocked(repositoryModule.loadEmoticonConfig)).toHaveBeenCalledTimes(1)
    })
  })
})
