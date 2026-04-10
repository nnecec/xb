import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppRoot } from '@/features/weibo/app/app-root'
import * as repositoryModule from '@/features/weibo/services/weibo-repository'

vi.mock('@/features/weibo/app/app-shell', () => ({
  AppShell: () => <div>app-shell</div>,
}))

vi.mock('@/features/weibo/app/weibo-history-sync', () => ({
  WeiboHistorySync: () => null,
}))

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
    render(<AppRoot />)

    await waitFor(() => {
      expect(vi.mocked(repositoryModule.loadEmoticonConfig)).toHaveBeenCalledTimes(1)
    })
  })
})
