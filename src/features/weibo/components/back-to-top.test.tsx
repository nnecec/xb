import { useScroll } from '@reactuses/core'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { BackToTop } from '@/features/weibo/components/back-to-top'

vi.mock('@reactuses/core', () => ({
  useScroll: vi.fn(),
}))

describe('BackToTop', () => {
  it('scrolls the provided container back to the top', () => {
    const scrollTo = vi.fn()
    const container = document.createElement('div')
    Object.defineProperty(container, 'scrollTo', {
      value: scrollTo,
      writable: true,
    })

    vi.mocked(useScroll).mockReturnValue([
      0,
      320,
      false,
      { bottom: false, left: false, right: false, top: false },
      { x: 'none', y: 'none' },
    ] as unknown as ReturnType<typeof useScroll>)

    render(<BackToTop containerRef={{ current: container }} threshold={200} />)

    fireEvent.click(screen.getByRole('button', { name: '返回顶部' }))

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })
})
