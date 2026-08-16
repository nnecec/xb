import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DEFAULT_APP_SETTINGS, type AppSettings } from '@/lib/app-settings'

import { SettingsDialog } from './settings-dialog'

const mockUpdateSettings = vi.fn().mockResolvedValue(undefined)
const mockSettings: AppSettings & {
  updateSettings: typeof mockUpdateSettings
  addUserTheme: ReturnType<typeof vi.fn>
  deleteUserTheme: ReturnType<typeof vi.fn>
  updateUserTheme: ReturnType<typeof vi.fn>
} = {
  ...DEFAULT_APP_SETTINGS,
  updateSettings: mockUpdateSettings,
  addUserTheme: vi.fn().mockResolvedValue(undefined),
  deleteUserTheme: vi.fn().mockResolvedValue(undefined),
  updateUserTheme: vi.fn().mockResolvedValue(undefined),
}

vi.mock('@/lib/app-settings-store', () => ({
  useAppSettings: vi.fn((selector) => selector(mockSettings)),
  useShallow: vi.fn((selector) => selector),
}))

describe('SettingsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.assign(mockSettings, DEFAULT_APP_SETTINGS)
    mockUpdateSettings.mockResolvedValue(undefined)
  })

  it('renders the large responsive settings shell', () => {
    render(<SettingsDialog open onOpenChange={() => {}} forceMount />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('data-state', 'open')
    expect(dialog).toHaveClass('h-[min(560px,80vh)]', 'w-[min(720px,84vw)]')
    expect(screen.getByRole('combobox', { name: '当前设置模块' })).toHaveTextContent('显示')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('keeps force-mounted content in the closed dialog state', () => {
    render(<SettingsDialog open={false} onOpenChange={() => {}} forceMount />)

    expect(screen.getByRole('dialog')).toHaveAttribute('data-state', 'closed')
  })

  it('renders the ten confirmed settings modules', () => {
    render(<SettingsDialog open onOpenChange={() => {}} forceMount />)

    const navigation = screen.getByRole('navigation')
    for (const label of [
      '显示',
      '主题',
      '字体',
      '导航布局',
      '信息流',
      '卡片',
      '媒体',
      '操作',
      '高级',
      '关于',
    ]) {
      expect(within(navigation).getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(screen.queryByText('设置搜索')).not.toBeInTheDocument()
  })

  it('shows display settings by default and reveals the custom width slider', () => {
    mockSettings.contentWidth = 'custom'
    mockSettings.customContentWidth = 1340

    render(<SettingsDialog open onOpenChange={() => {}} />)

    expect(screen.getByRole('button', { name: '显示' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('slider', { name: '自定义内容宽度' })).toHaveValue(1340)
    expect(screen.getByText('1340px')).toBeInTheDocument()
  })

  it('switches modules and remembers the active module while the dialog stays mounted', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SettingsDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '字体' }))
    expect(screen.getByRole('combobox', { name: '字体' })).toBeInTheDocument()

    rerender(<SettingsDialog open={false} onOpenChange={() => {}} />)
    rerender(<SettingsDialog open onOpenChange={() => {}} />)
    expect(screen.getByRole('combobox', { name: '字体' })).toBeInTheDocument()
  })

  it('shows every font setting without a fine-tuning disclosure', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '字体' }))

    expect(screen.getByRole('combobox', { name: '字体粗细' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '字间距' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '行高' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '精细调整' })).not.toBeInTheDocument()
  })

  it('groups theme mode, built-in themes and custom themes in one module', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '主题' }))

    expect(screen.getByText('明暗模式')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '内置主题' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '自定义主题' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '新建主题' })).toBeInTheDocument()
    expect(screen.getAllByRole('radio').length).toBeGreaterThan(1)
  })

  it('stretches built-in theme previews across each theme card', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '主题' }))

    expect(screen.getByText('Default').closest('label')).toHaveClass('items-stretch')
  })

  it('keeps the right content pane on a single vertical scroll container', () => {
    render(<SettingsDialog open onOpenChange={() => {}} forceMount />)

    const main = screen.getByRole('main')
    expect(main).toHaveClass('overflow-y-auto', 'overscroll-contain', 'h-0', 'min-h-0', 'flex-1')
    expect(main.parentElement).toHaveClass('overflow-hidden')
    expect(main.parentElement).not.toHaveClass('overflow-y-auto')

    const dialog = document.querySelector('[data-slot="dialog-content"]')
    const overlay = document.querySelector('[data-slot="dialog-overlay"]')
    expect(overlay).toContainElement(dialog as HTMLElement)
  })

  it('separates information flow from post and comment card settings', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '信息流' }))
    expect(screen.getByText('自动查看全文')).toBeInTheDocument()
    expect(screen.getByText('卡片间距')).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '微博' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '卡片' }))
    expect(screen.getByRole('tab', { name: '微博' })).toHaveAttribute('data-state', 'active')
    await user.click(screen.getByRole('tab', { name: '微博' }))
    expect(screen.getByText('转发链样式')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '折叠卡片' }))
    expect(mockUpdateSettings).toHaveBeenCalledWith({ replyChainDisplay: 'collapsed' })

    await user.click(screen.getByRole('tab', { name: '评论' }))
    expect(screen.getByText('评论密度')).toBeInTheDocument()
    expect(screen.getByText('默认折叠回复')).toBeInTheDocument()
  })

  it('separates media and action controls and progressively discloses fine tuning', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '媒体' }))
    expect(screen.queryByRole('slider', { name: '单图最大宽度' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '精细调整' }))
    expect(screen.getByRole('slider', { name: '单图最大宽度' })).toHaveValue(450)
    expect(screen.getByRole('slider', { name: '单视频最大宽度' })).toHaveValue(650)

    await user.click(screen.getByRole('button', { name: '操作' }))
    expect(screen.getByRole('radio', { name: /X 风格/ })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /微博风格/ })).toBeInTheDocument()
    expect(screen.getByText('显示互动数字')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /向前移动|向后移动/ })).not.toBeInTheDocument()
  })

  it('uses a flat navigation model and disables right-rail children with the parent', async () => {
    const user = userEvent.setup()
    mockSettings.showRightRail = false
    render(<SettingsDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '导航布局' }))

    const firstOpen = screen.getByText('首次打开')
    const leftNavigation = screen.getByText('左侧导航')
    expect(firstOpen.compareDocumentPosition(leftNavigation)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    expect(screen.getByRole('switch', { name: '显示右侧栏' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: '显示热搜卡片' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: '显示超话卡片' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: '首页默认时间线' })).toBeInTheDocument()
  })

  it('confirms and resets only the active tab group', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('button', { name: '信息流' }))
    await user.click(screen.getByRole('button', { name: '恢复默认设置' }))
    expect(screen.getByRole('alertdialog')).toHaveTextContent('恢复“信息流”默认设置？')
    await user.click(screen.getByRole('button', { name: '恢复默认' }))

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      feedDensity: DEFAULT_APP_SETTINGS.feedDensity,
      autoLoadLongText: DEFAULT_APP_SETTINGS.autoLoadLongText,
    })
  })

  it('shows save failures in the header and retries the failed change', async () => {
    const user = userEvent.setup()
    mockUpdateSettings.mockRejectedValueOnce(new Error('storage unavailable'))
    render(<SettingsDialog open onOpenChange={() => {}} />)

    await user.click(screen.getByRole('switch', { name: '暗色模式降低图片亮度' }))
    const retryButton = await screen.findByRole('button', { name: '保存失败，重试' })
    await user.click(retryButton)

    await waitFor(() => expect(mockUpdateSettings).toHaveBeenCalledTimes(2))
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: '保存失败，重试' })).not.toBeInTheDocument(),
    )
  })

  it('keeps version and project links in the dedicated About module', async () => {
    const user = userEvent.setup()
    render(<SettingsDialog open onOpenChange={() => {}} />)

    expect(screen.queryByRole('link', { name: 'xb 官网' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '关于' }))
    expect(screen.getByRole('link', { name: 'xb 官网' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GitHub' })).toBeInTheDocument()
  })

  it('calls onOpenChange from the accessible close button', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<SettingsDialog open onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: '关闭' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
