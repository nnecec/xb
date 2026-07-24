import {
  matchQuery,
  MutationCache,
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ProfileGroupButton } from '@/lib/weibo/components/profile-group-button'
import {
  createProfileGroup,
  loadProfileAssignedGroups,
  loadProfileAvailableGroups,
  setProfileGroups,
} from '@/lib/weibo/data/weibo-io'

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
    loadProfileAssignedGroups: vi.fn(async () => [
      {
        id: '5300067436070242',
        idstr: '5300067436070242',
        name: '特别厉害',
        mode: 'public',
        memberCount: 3,
        exist: true,
      },
    ]),
    loadProfileAvailableGroups: vi.fn(async () => [
      {
        id: '5300067436070242',
        idstr: '5300067436070242',
        name: '特别厉害',
        mode: 'public',
        memberCount: 3,
        exist: true,
      },
      {
        id: '5300073389099937',
        idstr: '5300073389099937',
        name: '我真不认识',
        mode: 'private',
        memberCount: 0,
        exist: false,
      },
    ]),
    createProfileGroup: vi.fn(async () => ({
      id: '5306878706060026',
      idstr: '5306878706060026',
      name: '超级厉害',
      mode: 'public',
      memberCount: null,
      exist: false,
    })),
    setProfileGroups: vi.fn(async () => {}),
  }
})

function renderProfileGroupButton({
  uid = '1783497251',
  following = true,
}: {
  uid?: string
  following?: boolean
} = {}) {
  const queryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess(data, variables, context, mutation) {
        const invalidates = mutation.meta?.invalidates as QueryKey[] | undefined

        if (invalidates) {
          queryClient.invalidateQueries({
            predicate: (query) =>
              invalidates.some((queryKey: QueryKey) => matchQuery({ queryKey }, query)),
          })
        }
      },
    }),
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileGroupButton uid={uid} following={following} />
    </QueryClientProvider>,
  )
}

describe('ProfileGroupButton', () => {
  beforeEach(() => {
    getCurrentUserUidMock.mockReset()
    getCurrentUserUidMock.mockReturnValue('9999')
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('is hidden for users that are not followed', () => {
    renderProfileGroupButton({ following: false })

    expect(screen.queryByRole('button', { name: '分组' })).not.toBeInTheDocument()
  })

  it('is hidden on the current user profile', () => {
    getCurrentUserUidMock.mockReturnValue('1783497251')

    renderProfileGroupButton()

    expect(screen.queryByRole('button', { name: '分组' })).not.toBeInTheDocument()
  })

  it('loads groups, preserves assigned checks, and submits selected groups', async () => {
    renderProfileGroupButton()

    fireEvent.click(screen.getByRole('button', { name: '分组' }))

    expect(await screen.findByRole('heading', { name: '关注分组' })).toBeInTheDocument()
    expect(loadProfileAssignedGroups).toHaveBeenCalledWith('1783497251')
    expect(loadProfileAvailableGroups).toHaveBeenCalledWith('1783497251')

    const specialGroup = screen.getByLabelText('特别厉害')
    const unknownGroup = screen.getByLabelText('我真不认识')
    expect(specialGroup).toBeChecked()
    expect(unknownGroup).not.toBeChecked()
    expect(screen.getByText('公开')).toBeInTheDocument()
    expect(screen.getByText('隐藏')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()

    fireEvent.click(unknownGroup)
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '保存' }))

    await waitFor(() => {
      expect(setProfileGroups).toHaveBeenCalledWith(
        '1783497251',
        ['5300067436070242', '5300073389099937'],
        ['5300067436070242'],
      )
    })
  })

  it('creates a group and refreshes group queries', async () => {
    renderProfileGroupButton()

    fireEvent.click(screen.getByRole('button', { name: '分组' }))
    expect(screen.queryByRole('textbox', { name: '新分组名称' })).not.toBeInTheDocument()

    fireEvent.click(await screen.findByRole('button', { name: '新建分组' }))
    fireEvent.change(screen.getByRole('textbox', { name: '新分组名称' }), {
      target: { value: '超级厉害' },
    })
    fireEvent.click(screen.getByRole('button', { name: '创建' }))

    await waitFor(() => {
      expect(createProfileGroup).toHaveBeenCalledWith('超级厉害', true)
    })
    await waitFor(() => {
      expect(loadProfileAvailableGroups).toHaveBeenCalledTimes(2)
    })
  })
})
