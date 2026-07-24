import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SpecialFollowButton } from '@/lib/weibo/components/special-follow-button'
import { setSpecialFollowUser } from '@/lib/weibo/data/weibo-io'

const getCurrentUserUidMock = vi.fn<() => string | null>()

vi.mock('@/lib/weibo/platform/current-user', () => ({
  getCurrentUserUid: () => getCurrentUserUidMock(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/weibo/data/weibo-io', async () => {
  const actual = await vi.importActual<typeof import('@/lib/weibo/data/weibo-io')>(
    '@/lib/weibo/data/weibo-io',
  )

  return {
    ...actual,
    setSpecialFollowUser: vi.fn(async () => {}),
  }
})

function renderSpecialFollowButton({
  uid = '1694917363',
  following = true,
  specialFollowing = true,
}: {
  uid?: string
  following?: boolean
  specialFollowing?: boolean
} = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <SpecialFollowButton uid={uid} following={following} specialFollowing={specialFollowing} />
    </QueryClientProvider>,
  )
}

describe('SpecialFollowButton', () => {
  beforeEach(() => {
    getCurrentUserUidMock.mockReset()
    getCurrentUserUidMock.mockReturnValue('9999')
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('is hidden for users that are not followed', () => {
    renderSpecialFollowButton({ following: false })

    expect(screen.queryByRole('button', { name: '设为特别关注' })).not.toBeInTheDocument()
  })

  it('is hidden on the current user profile', () => {
    getCurrentUserUidMock.mockReturnValue('1694917363')

    renderSpecialFollowButton()

    expect(screen.queryByRole('button', { name: '设为特别关注' })).not.toBeInTheDocument()
  })

  it('uses the profile special follow flag as the active state and cancels special follow', async () => {
    renderSpecialFollowButton()

    const button = screen.getByRole('button', { name: '取消特别关注' })
    expect(button).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(button)

    await waitFor(() => {
      expect(setSpecialFollowUser).toHaveBeenCalledWith('1694917363', false)
    })
  })

  it('sets special follow from the inactive state', async () => {
    renderSpecialFollowButton({ specialFollowing: false })

    const button = screen.getByRole('button', { name: '设为特别关注' })
    expect(button).toHaveAttribute('aria-pressed', 'false')

    fireEvent.click(button)

    await waitFor(() => {
      expect(setSpecialFollowUser).toHaveBeenCalledWith('1694917363', true)
    })
  })
})
