import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { AppSettings } from '@/lib/app-settings'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'

import { SettingsDialog } from './settings-dialog'

// Mock app settings store
const mockSettings: AppSettings = {
  ...DEFAULT_APP_SETTINGS,
}

vi.mock('@/lib/app-settings-store', () => ({
  useAppSettings: vi.fn((selector) => {
    if (typeof selector === 'function') {
      return selector(mockSettings)
    }
    return mockSettings
  }),
  useShallow: vi.fn((fn) => fn),
}))

// Mock chrome storage
const mockChromeStorage = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
  },
}

Object.defineProperty(global, 'chrome', {
  value: {
    storage: mockChromeStorage,
  },
  writable: true,
})

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSettings.contentWidth = DEFAULT_APP_SETTINGS.contentWidth
    mockSettings.customContentWidth = DEFAULT_APP_SETTINGS.customContentWidth
  })

  it('renders dialog when open', () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} forceMount />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('data-state', 'open')
    expect(screen.getByText('设置')).toBeInTheDocument()
  })

  it('has closed state when not open', () => {
    render(<SettingsDialog open={false} onOpenChange={() => {}} forceMount />)

    const dialog = screen.getByRole('dialog')
    // Dialog is still in DOM but with data-state="closed"
    expect(dialog).toHaveAttribute('data-state', 'closed')
  })

  it('renders all sidebar groups', () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} forceMount />)

    // Check for main setting groups - use getAllByText to handle duplicates
    const appearanceElements = screen.getAllByText('外观')
    expect(appearanceElements.length).toBeGreaterThan(0)

    expect(screen.getByText('主题')).toBeInTheDocument()
    expect(screen.getByText('个性化')).toBeInTheDocument()
    expect(screen.getByText('字体')).toBeInTheDocument()
    expect(screen.getByText('高级')).toBeInTheDocument()
  })

  it('switches between different setting panels', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    // Default panel is 'appearance'
    expect(screen.getByText('主题模式')).toBeInTheDocument()

    // Click on theme panel
    const themeButton = screen.getByRole('button', { name: /主题/ })
    await user.click(themeButton)

    // Should show theme-related content
    expect(screen.getByText('自定义主题')).toBeInTheDocument()
  })

  it('displays appearance settings in default panel', () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    // Appearance panel should be default
    expect(screen.getByText('主题模式')).toBeInTheDocument()
    expect(screen.getByText('内容宽度')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '更窄' })).toBeInTheDocument()
  })

  it('shows the custom content width slider when custom width is selected', () => {
    mockSettings.contentWidth = 'custom'
    mockSettings.customContentWidth = 1340

    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    expect(screen.getByRole('slider', { name: '自定义内容宽度' })).toHaveValue(1340)
    expect(screen.getByText('1340px')).toBeInTheDocument()
  })

  it('shows timeline reading preferences in the personalize panel', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: /个性化/ }))

    expect(screen.getByText('自动查看全文')).toBeInTheDocument()
    expect(screen.getByText('纯文字信息流')).toBeInTheDocument()
  })

  it('renders page visibility section in appearance panel', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    // Click on appearance panel
    const appearanceButton = screen.getByRole('button', { name: /外观/ })
    await user.click(appearanceButton)

    // Should show page visibility section as the last item in appearance
    expect(screen.getByText('页面可见性')).toBeInTheDocument()
  })

  it('calls onOpenChange when close button clicked', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()

    render(<SettingsDialog open={true} onOpenChange={onOpenChange} />)

    // Find and click close button
    const closeButtons = screen.getAllByRole('button')
    const closeButton = closeButtons.find((btn) => btn.getAttribute('aria-label') === 'Close')

    if (closeButton) {
      await user.click(closeButton)
      expect(onOpenChange).toHaveBeenCalledWith(false)
    }
  })

  it('displays font size options', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    // Navigate to font panel using button with role
    const buttons = screen.getAllByRole('button')
    const fontButton = buttons.find((btn) => btn.textContent?.includes('字体'))
    expect(fontButton).toBeDefined()

    if (fontButton) {
      await user.click(fontButton)
      // Should show font size section
      expect(screen.getByText('字体大小')).toBeInTheDocument()
    }
  })

  it('shows theme picker in theme panel', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    // Navigate to theme panel
    const buttons = screen.getAllByRole('button')
    const themeButton = buttons.find((btn) => btn.textContent?.includes('主题'))
    expect(themeButton).toBeDefined()

    if (themeButton) {
      await user.click(themeButton)
      // Should show custom theme section
      expect(screen.getByText('自定义主题')).toBeInTheDocument()
    }
  })
})
