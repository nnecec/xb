import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { AppSettings } from '@/lib/app-settings'
import { DEFAULT_APP_SETTINGS } from '@/lib/app-settings'

import { SettingsDialog } from './settings-dialog'

// Mock app settings store
const mockUpdateSettings = vi.fn().mockResolvedValue(undefined)
const mockSettings: AppSettings & {
  updateSettings: typeof mockUpdateSettings
  addUserTheme: ReturnType<typeof vi.fn>
  deleteUserTheme: ReturnType<typeof vi.fn>
  updateUserTheme: ReturnType<typeof vi.fn>
} = {
  ...DEFAULT_APP_SETTINGS,
  updateSettings: mockUpdateSettings,
  addUserTheme: vi.fn(),
  deleteUserTheme: vi.fn(),
  updateUserTheme: vi.fn(),
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
    Object.assign(mockSettings, DEFAULT_APP_SETTINGS)
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
    expect(screen.queryByText('个性化')).not.toBeInTheDocument()
    expect(screen.getByText('字体')).toBeInTheDocument()
    expect(screen.getByText('高级')).toBeInTheDocument()
  })

  it('switches between different setting panels', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    // Default panel is 'appearance'
    expect(screen.getByRole('tab', { name: '应用整体' })).toHaveAttribute('data-state', 'active')

    // Click on theme panel
    const themeButton = screen.getByRole('button', { name: /主题/ })
    await user.click(themeButton)

    // Should show theme-related content
    expect(screen.getByText('主题模式')).toBeInTheDocument()
    expect(screen.getByText('自定义主题')).toBeInTheDocument()
  })

  it('displays appearance settings in default panel', () => {
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    // Appearance panel should be default
    expect(screen.getByText('内容宽度')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '更窄' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '信息流' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '微博卡片' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: '评论卡片' })).toBeInTheDocument()
  })

  it('shows the custom content width slider when custom width is selected', () => {
    mockSettings.contentWidth = 'custom'
    mockSettings.customContentWidth = 1340

    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    const slider = screen.getByRole('slider', { name: '自定义内容宽度' })
    expect(slider).toHaveValue(1340)
    expect(slider).toHaveAttribute('aria-valuemax', '2000')
    expect(screen.getByText('1340px')).toBeInTheDocument()
  })

  it('shows timeline reading preferences in the feed tab', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    await user.click(screen.getByRole('tab', { name: '信息流' }))

    expect(screen.getByText('自动查看全文')).toBeInTheDocument()
    expect(screen.getByText('信息流密度')).toBeInTheDocument()
    expect(screen.queryByText('纯文字信息流')).not.toBeInTheDocument()
  })

  it('shows entity-specific controls in card tabs', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    await user.click(screen.getByRole('tab', { name: '微博卡片' }))
    expect(screen.getByText('显示发布信息')).toBeInTheDocument()
    expect(screen.getByText('固定到操作栏')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /X 风格/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /微博风格/ })).toBeInTheDocument()
    expect(screen.queryByText('作者与元信息')).not.toBeInTheDocument()
    expect(screen.queryByText('媒体')).not.toBeInTheDocument()
    expect(screen.queryByText('正文')).not.toBeInTheDocument()
    expect(screen.queryByText('互动')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '评论卡片' }))
    expect(screen.getByText('评论密度')).toBeInTheDocument()
    expect(screen.getByText('默认折叠回复')).toBeInTheDocument()
  })

  it('shows grid-specific multi-media controls by default', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    await user.click(screen.getByRole('tab', { name: '微博卡片' }))

    expect(screen.getByText('多图展示')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '宫格' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('slider', { name: '单图最大宽度' })).toHaveValue(450)
    expect(screen.getByRole('slider', { name: '单图最大宽度' })).toHaveAttribute(
      'aria-valuemin',
      '160',
    )
    expect(screen.getByRole('slider', { name: '单图最大宽度' })).toHaveAttribute(
      'aria-valuemax',
      '1200',
    )
    expect(screen.getByRole('slider', { name: '单视频最大宽度' })).toHaveValue(650)
    expect(screen.getByRole('radio', { name: '9 张' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('slider', { name: '宫格最大宽度' })).toHaveValue(650)
    expect(screen.queryByRole('slider', { name: '画廊高度' })).not.toBeInTheDocument()
  })

  it('shows only the strip height control for horizontal multi-media layout', async () => {
    const user = userEvent.setup()
    mockSettings.weiboCardMultiMediaLayout = 'horizontal'
    mockSettings.weiboCardMultiMediaStripHeight = 480

    render(<SettingsDialog open={true} onOpenChange={() => {}} />)
    await user.click(screen.getByRole('tab', { name: '微博卡片' }))

    const label = screen.getByText('多图展示')
    expect(label.parentElement?.parentElement).toHaveClass(
      'flex',
      'items-center',
      'justify-between',
    )
    expect(screen.getByRole('radio', { name: '画廊' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('slider', { name: '画廊高度' })).toHaveValue(480)
    expect(screen.queryByRole('slider', { name: '宫格最大宽度' })).not.toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: '9 张' })).not.toBeInTheDocument()
  })

  it('confirms and resets only the active category', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    await user.click(screen.getByRole('tab', { name: '信息流' }))
    await user.click(screen.getByRole('button', { name: '恢复默认设置' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '恢复默认' }))

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      firstLoadRedirect: DEFAULT_APP_SETTINGS.firstLoadRedirect,
      feedDensity: DEFAULT_APP_SETTINGS.feedDensity,
      autoLoadLongText: DEFAULT_APP_SETTINGS.autoLoadLongText,
    })
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
      // Should show both independent font size controls
      expect(screen.getByText('界面字号')).toBeInTheDocument()
      expect(screen.getByText('正文字号')).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: '界面字号' })).toHaveTextContent('14px')
      expect(screen.getByRole('combobox', { name: '正文字号' })).toHaveTextContent('16px')
    }
  })

  it('updates and resets independent UI and content font sizes', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open={true} onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: /字体/ }))

    await user.click(screen.getByRole('combobox', { name: '界面字号' }))
    await user.click(screen.getByRole('option', { name: '20px' }))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ uiFontSize: 20 })

    await user.click(screen.getByRole('combobox', { name: '正文字号' }))
    await user.click(screen.getByRole('option', { name: '32px' }))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ contentFontSize: 32 })

    await user.click(screen.getByRole('button', { name: '恢复默认' }))
    expect(mockUpdateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        uiFontSize: DEFAULT_APP_SETTINGS.uiFontSize,
        contentFontSize: DEFAULT_APP_SETTINGS.contentFontSize,
      }),
    )
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
