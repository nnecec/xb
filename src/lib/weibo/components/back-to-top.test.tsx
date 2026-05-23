import { fireEvent, render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BackToTop } from '@/lib/weibo/components/back-to-top'

afterEach(() => {
  cleanup()
})

describe('BackToTop', () => {
  it('scrolls the provided container back to the top', () => {
    const scrollTo = vi.fn()
    const container = document.createElement('div')
    Object.defineProperty(container, 'scrollTo', {
      value: scrollTo,
      writable: true,
    })
    Object.defineProperty(container, 'scrollTop', {
      value: 320,
      writable: true,
    })

    render(<BackToTop scrollRoot={container} threshold={200} />)

    fireEvent.click(screen.getByRole('button', { name: '返回顶部' }))

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' })
  })

  it('shows button when scrolled past threshold', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'scrollTop', {
      value: 320,
      writable: true,
    })

    render(<BackToTop scrollRoot={container} threshold={200} />)

    const button = screen.getByRole('button', { name: '返回顶部' })
    expect(button).toHaveClass('pointer-events-auto', 'opacity-100')
  })

  it('hides button when scrolled before threshold', () => {
    const container = document.createElement('div')
    Object.defineProperty(container, 'scrollTop', {
      value: 100,
      writable: true,
    })

    render(<BackToTop scrollRoot={container} threshold={200} />)

    const button = screen.getByRole('button', { name: '返回顶部' })
    expect(button).toHaveClass('pointer-events-none', 'opacity-0')
  })
})
