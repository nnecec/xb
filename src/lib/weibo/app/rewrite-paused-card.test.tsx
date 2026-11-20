import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { APP_SETTINGS_STORAGE_KEY } from '@/lib/app-settings'
import { getAppSettingsStore, resetAppSettingsStoreForTest } from '@/lib/app-settings-store'
import { RewritePausedCard } from '@/lib/weibo/app/app-shell-layout'

afterEach(() => {
  cleanup()
})

describe('RewritePausedCard', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'browser', {
      writable: true,
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
      isHydrated: true,
      navigation: { ...store.getState().navigation, xbEntryCollapsed: false },
    })
  })

  it('renders the entry card in the expanded state', () => {
    render(<RewritePausedCard onResume={vi.fn()} />)

    const shell = screen.getByTestId('xb-entry')
    expect(shell).toHaveAttribute('data-state', 'expanded')
    expect(shell).not.toHaveAttribute('role', 'button')
    expect(screen.getByTestId('xb-entry-cta')).toBeInTheDocument()
    expect(screen.getByTestId('xb-corner-collapse')).toBeInTheDocument()
    expect(screen.queryByTestId('xb-corner-expand')).not.toBeInTheDocument()
  })

  it('collapses into the mini pill when the corner button is clicked', async () => {
    const user = userEvent.setup()
    render(<RewritePausedCard onResume={vi.fn()} />)

    await user.click(screen.getByTestId('xb-corner-collapse'))

    await waitFor(() => {
      expect(screen.getByTestId('xb-entry')).toHaveAttribute('data-state', 'collapsed')
    })
    expect(screen.getByTestId('xb-corner-expand')).toBeInTheDocument()
    expect(screen.queryByTestId('xb-corner-collapse')).not.toBeInTheDocument()
  })

  it('persists collapsed state to the app settings store', async () => {
    const user = userEvent.setup()
    render(<RewritePausedCard onResume={vi.fn()} />)

    await user.click(screen.getByTestId('xb-corner-collapse'))

    await waitFor(() => {
      expect(getAppSettingsStore().getState().navigation.xbEntryCollapsed).toBe(true)
    })
  })

  it('renders collapsed on mount when the persisted state is collapsed', () => {
    const store = getAppSettingsStore()
    store.setState({
      ...store.getState(),
      navigation: { ...store.getState().navigation, xbEntryCollapsed: true },
    })

    render(<RewritePausedCard onResume={vi.fn()} />)

    const shell = screen.getByTestId('xb-entry')
    expect(shell).toHaveAttribute('data-state', 'collapsed')
    expect(screen.getByTestId('xb-corner-expand')).toBeInTheDocument()
    expect(screen.queryByTestId('xb-corner-collapse')).not.toBeInTheDocument()
  })

  it('hides the CTA visually while collapsed', async () => {
    const user = userEvent.setup()
    render(<RewritePausedCard onResume={vi.fn()} />)

    await user.click(screen.getByTestId('xb-corner-collapse'))

    await waitFor(() => {
      expect(screen.getByTestId('xb-entry-body')).toHaveStyle({ opacity: '0' })
    })
  })

  it('restores the expanded card when the mini pill expand button is clicked', async () => {
    const user = userEvent.setup()
    render(<RewritePausedCard onResume={vi.fn()} />)

    await user.click(screen.getByTestId('xb-corner-collapse'))
    await waitFor(() => screen.getByTestId('xb-corner-expand'))

    await user.click(screen.getByTestId('xb-corner-expand'))

    await waitFor(() => {
      expect(screen.getByTestId('xb-entry')).toHaveAttribute('data-state', 'expanded')
    })
    expect(screen.getByTestId('xb-entry-cta')).toBeInTheDocument()
    expect(screen.queryByTestId('xb-corner-expand')).not.toBeInTheDocument()
  })

  it('invokes onResume when the CTA in the expanded card is clicked', async () => {
    const user = userEvent.setup()
    const onResume = vi.fn()
    render(<RewritePausedCard onResume={onResume} />)

    await user.click(screen.getByTestId('xb-entry-cta'))

    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('invokes onResume when the mini pill body is clicked', async () => {
    const user = userEvent.setup()
    const onResume = vi.fn()
    render(<RewritePausedCard onResume={onResume} />)

    await user.click(screen.getByTestId('xb-corner-collapse'))
    await waitFor(() => screen.getByTestId('xb-corner-expand'))

    await user.click(screen.getByTestId('xb-entry'))

    expect(onResume).toHaveBeenCalledTimes(1)
  })

  it('does not invoke onResume when the expand button inside the mini pill is clicked', async () => {
    const user = userEvent.setup()
    const onResume = vi.fn()
    render(<RewritePausedCard onResume={onResume} />)

    await user.click(screen.getByTestId('xb-corner-collapse'))
    await waitFor(() => screen.getByTestId('xb-corner-expand'))

    await user.click(screen.getByTestId('xb-corner-expand'))

    expect(onResume).not.toHaveBeenCalled()
  })
})
