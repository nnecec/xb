import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { EmoticonPicker } from '@/features/weibo/components/emoticon-picker'

const rememberMock = vi.fn(async () => {})
const hydrateMock = vi.fn(async () => {})

vi.mock('@/features/weibo/app/emoticon-query', () => ({
  useEmoticonConfigQuery: vi.fn(() => ({
    data: {
      groups: [
        {
          title: '默认',
          items: [
            { phrase: '[嘿哈]', url: 'https://face/heiha.png' },
            { phrase: '[色]', url: 'https://face/se.png' },
          ],
        },
      ],
    },
  })),
}))

vi.mock('@/features/weibo/app/recent-emoticons-store', () => ({
  useRecentEmoticons: vi.fn((selector: (state: any) => unknown) =>
    selector({
      isHydrated: true,
      hydrate: hydrateMock,
      items: [{ phrase: '[赞]', url: 'https://face/zan.png' }],
      remember: rememberMock,
    }),
  ),
}))

describe('EmoticonPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders tabs and emits selected emoticon while remembering it', () => {
    const onSelect = vi.fn()

    render(<EmoticonPicker onSelect={onSelect} />)

    fireEvent.pointerDown(screen.getByRole('button', { name: '表情' }), {
      button: 0,
      ctrlKey: false,
    })

    expect(screen.getByRole('tab', { name: '最近' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '默认' })).toBeInTheDocument()

    const recentImage = screen.getByRole('img', { name: '[赞]' })
    fireEvent.click(recentImage.closest('button') as HTMLButtonElement)

    expect(onSelect).toHaveBeenCalledWith({
      phrase: '[赞]',
      url: 'https://face/zan.png',
    })
    expect(rememberMock).toHaveBeenCalledWith({
      phrase: '[赞]',
      url: 'https://face/zan.png',
    })
    expect(screen.queryByRole('tab', { name: '默认' })).not.toBeInTheDocument()
  })
})
