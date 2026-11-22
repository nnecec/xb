import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ProfileSearchBar } from '@/lib/weibo/components/profile-search-bar'
import {
  DEFAULT_PROFILE_SEARCH_FILTERS,
  type ProfileSearchUrlState,
} from '@/lib/weibo/route/profile-search-params'

const state: ProfileSearchUrlState = {
  active: false,
  params: {
    query: '',
    starttime: null,
    endtime: 1_780_848_000,
    filters: { ...DEFAULT_PROFILE_SEARCH_FILTERS },
  },
}

describe('ProfileSearchBar', () => {
  it('keeps type and date filters inside the advanced filter layer', async () => {
    const user = userEvent.setup()
    render(<ProfileSearchBar state={state} onSubmit={vi.fn()} onClear={vi.fn()} />)

    expect(screen.queryByRole('button', { name: '筛选微博类型' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '选择开始日期' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '开始时间' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '高级筛选' }))

    expect(await screen.findByText('全部')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始时间' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '结束时间' })).toBeInTheDocument()
  })
})
