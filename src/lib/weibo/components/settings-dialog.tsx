import {
  Bookmark,
  Compass,
  Copy,
  Download,
  GripVertical,
  Heart,
  History,
  Home,
  Image,
  LinkIcon,
  MessageSquare,
  MessageCircle,
  Palette,
  PanelRight,
  Pencil,
  Repeat2,
  Settings,
  Sparkles,
  SunMoon,
  Type,
  User,
  Bell,
  PanelLeft,
  XIcon,
} from 'lucide-react'
import { Reorder } from 'motion/react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import darkModeImageDimJpeg from '@/assets/images/dark-mode-image-dim.jpeg'
import collapseReplyChain from '@/assets/images/quotechains-collapsible.jpeg'
import quoteChainsJpeg from '@/assets/images/quotechains.jpeg'
import { TreeView, type TreeDataItem } from '@/components/tree-view'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { getUiPortalContainer } from '@/components/ui/portal'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  BROWSING_HISTORY_LIMIT_OPTIONS,
  DEFAULT_APP_SETTINGS,
  FEED_TOOLBAR_BUTTON_IDS,
  type AppSettings,
} from '@/lib/app-settings'
import type {
  AppTheme,
  BrowsingHistoryLimit,
  ContentWidth,
  FeedInteractionMode,
  FeedPrimaryActionId,
  FeedToolbarButtonId,
  FontFamilyClass,
  FontSizeClass,
  FontWeightClass,
  LetterSpacingClass,
  LineHeightClass,
  UserTheme,
} from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { CUSTOM_THEME_PRESETS } from '@/lib/custom-theme'
import {
  isRemoteFont,
  loadFont,
  REMOTE_FONT_OPTIONS,
  type RemoteFontFamily,
} from '@/lib/font-loader'
import { cn } from '@/lib/utils'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'

import { FontPreviewCard } from './settings-font-preview'
import { SettingsThemePicker } from './settings-theme-picker'

const SIDEBAR_GROUPS = [
  { id: 'appearance' as const, label: '外观', icon: SunMoon },
  { id: 'theme' as const, label: '主题', icon: Palette },
  { id: 'personalize' as const, label: '个性化', icon: Sparkles },
  { id: 'font' as const, label: '字体', icon: Type },
  { id: 'advanced' as const, label: '高级', icon: Settings },
]

type GroupId = (typeof SIDEBAR_GROUPS)[number]['id']

const PAGE_VISIBILITY_KEYS = {
  explore: 'showExplore',
  favorites: 'showFavorites',
  history: 'showHistory',
  notifications: 'showNotifications',
  dms: 'showDMs',
  profile: 'showProfile',
  compose: 'showCompose',
  'right-rail': 'showRightRail',
  'hot-search': 'showHotSearchCard',
  'super-topic': 'showFollowedSuperTopicsCard',
} as const satisfies Record<string, keyof AppSettings>

const PRIMARY_ACTION_OPTIONS: Array<{
  id: FeedPrimaryActionId
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: 'comment', label: '评论', icon: MessageCircle },
  { id: 'repost', label: '转发', icon: Repeat2 },
  { id: 'like', label: '点赞', icon: Heart },
]

const TOOLBAR_BUTTON_OPTIONS: Array<{
  id: FeedToolbarButtonId
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: 'favorite', label: '收藏', icon: Bookmark },
  { id: 'copy-link', label: '复制链接', icon: LinkIcon },
  { id: 'copy-text', label: '复制正文', icon: Copy },
  { id: 'download-media', label: '批量下载', icon: Download },
  { id: 'gen-image', label: '生图', icon: Image },
]

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Force mount the dialog content even when closed (used for tests / animation). */
  forceMount?: boolean
}

const DIALOG_CONTENT_CLASSES = 'flex h-[560px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]'

function DialogContentMaybeForced({
  forceMount,
  children,
}: {
  forceMount?: boolean
  children: React.ReactNode
}) {
  if (forceMount) {
    return <ForcedDialogContent>{children}</ForcedDialogContent>
  }
  return <DialogContent className={DIALOG_CONTENT_CLASSES}>{children}</DialogContent>
}

function ForcedDialogContent({ children }: { children: React.ReactNode }) {
  const container = React.useMemo(() => getUiPortalContainer(), [])
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal" container={container} forceMount>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
        forceMount
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        forceMount
        className={DIALOG_CONTENT_CLASSES}
      >
        {children}
        <DialogPrimitive.Close
          data-slot="dialog-close"
          className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
        >
          <XIcon />
          <span className="sr-only">关闭</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent/50 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors data-[active=true]:font-medium"
      data-active={active || undefined}
    >
      <Icon size={16} strokeWidth={1.5} />
      {label}
    </button>
  )
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-[11px] first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label className="text-sm leading-snug font-medium">{label}</Label>
        {description && (
          <span className="text-muted-foreground text-xs leading-relaxed">{description}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function IllustrationPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 border-muted-foreground/20 text-muted-foreground flex items-center justify-center rounded-lg border p-4 text-xs">
      {children}
    </div>
  )
}

function StackedField({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 py-[11px] first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label className="text-sm leading-snug font-medium">{label}</Label>
        {description && (
          <span className="text-muted-foreground text-xs leading-relaxed">{description}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function OptionPills<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'bg-muted inline-flex max-w-full shrink-0 flex-wrap rounded-lg p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
            value === option.value
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

const FEED_INTERACTION_OPTIONS: Array<{
  value: FeedInteractionMode
  label: string
  description: string
}> = [
  {
    value: 'x',
    label: 'X 风格',
    description: '点击卡片进入详情，评论按钮弹出评论框',
  },
  {
    value: 'weibo',
    label: '微博风格',
    description: '评论按钮展开精选评论，点击查看更多进入详情',
  },
]

export function SettingsDialog({ open, onOpenChange, forceMount = false }: SettingsDialogProps) {
  const [version, setVersion] = useState<string>('')
  const [activeGroup, setActiveGroup] = useState<GroupId>('appearance')
  const settingsMainRef = useRef<HTMLElement>(null)

  const {
    fontSizeClass,
    fontWeightClass,
    letterSpacingClass,
    lineHeightClass,
    fontFamilyClass,
    showHotSearchCard,
    showFollowedSuperTopicsCard,
    showExplore,
    showFavorites,
    showHistory,
    showNotifications,
    showDMs,
    showProfile,
    showCompose,
    showRightRail,
    collapseRepliesEnabled,
    renderReplyChainEnabled,
    darkModeImageDim,
    theme,
    feedInteractionMode,
    feedPrimaryActionOrder,
    feedToolbarButtonIds,
    contentWidth,
    xbTopicPage,
    ratingEnabled,
    rememberPlaybackRate,
    firstLoadRedirect,
    selectedThemeType,
    selectedThemeId,
    userThemes,
    customThemeLightCss,
    customThemeDarkCss,
    browsingHistoryLimit,
    updateSettings,
    addUserTheme,
    deleteUserTheme,
    updateUserTheme,
  } = useAppSettings(
    useShallow((s) => ({
      fontSizeClass: s.fontSizeClass,
      fontWeightClass: s.fontWeightClass,
      letterSpacingClass: s.letterSpacingClass,
      lineHeightClass: s.lineHeightClass,
      fontFamilyClass: s.fontFamilyClass,
      showHotSearchCard: s.showHotSearchCard,
      showFollowedSuperTopicsCard: s.showFollowedSuperTopicsCard,
      showExplore: s.showExplore,
      showFavorites: s.showFavorites,
      showHistory: s.showHistory,
      showNotifications: s.showNotifications,
      showDMs: s.showDMs,
      showProfile: s.showProfile,
      showCompose: s.showCompose,
      showRightRail: s.showRightRail,
      collapseRepliesEnabled: s.collapseRepliesEnabled,
      renderReplyChainEnabled: s.renderReplyChainEnabled,
      darkModeImageDim: s.darkModeImageDim,
      theme: s.theme,
      feedInteractionMode: s.feedInteractionMode,
      feedPrimaryActionOrder: s.feedPrimaryActionOrder,
      feedToolbarButtonIds: s.feedToolbarButtonIds,
      contentWidth: s.contentWidth,
      xbTopicPage: s.xbTopicPage,
      ratingEnabled: s.ratingEnabled,
      rememberPlaybackRate: s.rememberPlaybackRate,
      firstLoadRedirect: s.firstLoadRedirect,
      selectedThemeType: s.selectedThemeType,
      selectedThemeId: s.selectedThemeId,
      userThemes: s.userThemes,
      customThemeLightCss: s.customThemeLightCss,
      customThemeDarkCss: s.customThemeDarkCss,
      browsingHistoryLimit: s.browsingHistoryLimit,
      updateSettings: s.updateSettings,
      addUserTheme: s.addUserTheme,
      deleteUserTheme: s.deleteUserTheme,
      updateUserTheme: s.updateUserTheme,
    })),
  )

  const pageElementTreeData = useMemo<TreeDataItem[]>(
    () => [
      {
        id: 'left-rail',
        name: '左侧边栏',
        icon: PanelLeft,
        disabled: true,
        children: [
          { id: 'home', name: '主页', icon: Home, disabled: true },
          { id: 'explore', name: '探索', icon: Compass },
          { id: 'favorites', name: '收藏', icon: Bookmark },
          { id: 'history', name: '历史', icon: History },
          { id: 'notifications', name: '通知', icon: Bell },
          { id: 'dms', name: '私信', icon: MessageSquare },
          { id: 'profile', name: '我的', icon: User },
          { id: 'compose', name: '发微博', icon: Pencil },
        ],
      },
      {
        id: 'right-rail',
        name: '右侧边栏',
        icon: PanelRight,
        children: [
          { id: 'hot-search', name: '热搜卡片' },
          { id: 'super-topic', name: '超话卡片' },
        ],
      },
    ],
    [],
  )

  const pageVisibility = {
    showExplore,
    showFavorites,
    showHistory,
    showNotifications,
    showDMs,
    showProfile,
    showCompose,
    showRightRail,
    showHotSearchCard,
    showFollowedSuperTopicsCard,
  }

  function getSwitchState(id: string): boolean {
    if (id === 'home') {
      return true
    }

    const key = PAGE_VISIBILITY_KEYS[id as keyof typeof PAGE_VISIBILITY_KEYS]
    return key ? pageVisibility[key] : true
  }

  function setSwitchState(id: string, checked: boolean) {
    const key = PAGE_VISIBILITY_KEYS[id as keyof typeof PAGE_VISIBILITY_KEYS]
    if (key) {
      void updateSettings({ [key]: checked })
    }
  }

  function renderTreeItem({ item, isLeaf }: { item: TreeDataItem; isLeaf: boolean }) {
    const isParent = !isLeaf && item.id !== 'home'
    const isRightRailChild = item.id === 'hot-search' || item.id === 'super-topic'
    const disabledByParent = isRightRailChild && !showRightRail

    return (
      <div className="flex flex-1 items-center justify-between">
        <span className="flex items-center gap-2 text-sm">
          {item.icon && <item.icon className="size-4 shrink-0" />}
          {item.name}
        </span>
        {!item.disabled && (
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={getSwitchState(item.id)}
              disabled={isParent ? false : disabledByParent}
              onCheckedChange={(checked) => setSwitchState(item.id, checked)}
            />
          </div>
        )}
      </div>
    )
  }
  useEffect(() => {
    if (typeof browser !== 'undefined' && browser.runtime?.getManifest) {
      setVersion(browser.runtime.getManifest().version)
    }
  }, [])

  const [fontFamilyLoading, setFontFamilyLoading] = useState(false)

  function resetFontSettings() {
    void updateSettings({
      fontSizeClass: DEFAULT_APP_SETTINGS.fontSizeClass,
      fontWeightClass: DEFAULT_APP_SETTINGS.fontWeightClass,
      letterSpacingClass: DEFAULT_APP_SETTINGS.letterSpacingClass,
      lineHeightClass: DEFAULT_APP_SETTINGS.lineHeightClass,
      fontFamilyClass: DEFAULT_APP_SETTINGS.fontFamilyClass,
    })
  }

  async function handleFontFamilyChange(value: string) {
    const next = value as FontFamilyClass
    if (!isRemoteFont(next)) {
      void updateSettings({ fontFamilyClass: next })
      return
    }

    setFontFamilyLoading(true)
    try {
      const ok = await loadFont(next as RemoteFontFamily)
      if (!ok) {
        toast.error('字体加载失败，请检查网络后重试')
        return
      }
      void updateSettings({ fontFamilyClass: next })
    } finally {
      setFontFamilyLoading(false)
    }
  }

  function handleSelectPresetTheme(presetKey: string) {
    const preset = CUSTOM_THEME_PRESETS.find((item) => item.key === presetKey)
    void updateSettings({
      selectedThemeType: 'preset',
      selectedThemeId: presetKey,
      ...(preset
        ? { customThemeLightCss: preset.lightCss, customThemeDarkCss: preset.darkCss }
        : {}),
    })
  }

  function handleSelectUserTheme(themeId: string) {
    const theme = userThemes.find((item) => item.id === themeId)
    if (theme) {
      void updateSettings({
        selectedThemeType: 'custom',
        selectedThemeId: themeId,
        customThemeLightCss: theme.lightCss,
        customThemeDarkCss: theme.darkCss,
      })
    }
  }

  function handleAddCustomTheme(): string {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const count = userThemes.filter((theme) => theme.name.startsWith('自定义主题')).length + 1
    const theme: UserTheme = {
      id,
      name: `自定义主题 ${count}`,
      lightCss: customThemeLightCss,
      darkCss: customThemeDarkCss,
    }
    void addUserTheme(theme)
    void updateSettings({
      selectedThemeType: 'custom',
      selectedThemeId: id,
    })
    return id
  }

  function handleDeleteUserTheme(themeId: string) {
    const preset = CUSTOM_THEME_PRESETS.find((item) => item.key === 'default')
    void deleteUserTheme(themeId)
    if (selectedThemeType === 'custom' && selectedThemeId === themeId) {
      void updateSettings({
        selectedThemeType: 'preset',
        selectedThemeId: 'default',
        ...(preset
          ? { customThemeLightCss: preset.lightCss, customThemeDarkCss: preset.darkCss }
          : {}),
      })
    }
  }

  function handleLightCssChange(value: string) {
    void updateSettings({ customThemeLightCss: value })
    if (selectedThemeType === 'custom') {
      void updateUserTheme(selectedThemeId, { lightCss: value })
    }
  }

  function handleDarkCssChange(value: string) {
    void updateSettings({ customThemeDarkCss: value })
    if (selectedThemeType === 'custom') {
      void updateUserTheme(selectedThemeId, { darkCss: value })
    }
  }

  function handleBrowsingHistoryLimitChange(value: string) {
    const limit = Number(value) as BrowsingHistoryLimit
    void updateSettings({ browsingHistoryLimit: limit }).then(() => {
      browsingHistoryStore.getState().trimToLimit(limit)
    })
  }

  function handlePrimaryActionOrderChange(value: FeedPrimaryActionId[]) {
    void updateSettings({ feedPrimaryActionOrder: value })
  }

  function handleToolbarButtonToggle(id: FeedToolbarButtonId, checked: boolean) {
    const selected = new Set(feedToolbarButtonIds)

    if (checked) {
      selected.add(id)
    } else {
      selected.delete(id)
    }

    void updateSettings({
      feedToolbarButtonIds: FEED_TOOLBAR_BUTTON_IDS.filter((buttonId) => selected.has(buttonId)),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentMaybeForced forceMount={forceMount}>
        <DialogHeader>
          <DialogTitle className="px-6 pt-5 text-base tracking-tight">设置</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>调整 xb 的外观、阅读行为和字体。</DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="border-border/40 w-[180px] shrink-0 overflow-y-auto border-r p-3">
            <div className="flex flex-col gap-0.5">
              {SIDEBAR_GROUPS.map((group) => (
                <SidebarItem
                  key={group.id}
                  icon={group.icon}
                  label={group.label}
                  active={activeGroup === group.id}
                  onClick={() => setActiveGroup(group.id)}
                />
              ))}
            </div>
          </aside>

          <main ref={settingsMainRef} className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            {activeGroup === 'appearance' && (
              <div className="flex flex-col">
                <div className="divide-border/40 divide-y px-6 py-4">
                  <Field label="主题模式" description="选择 xb 使用浅色、深色或系统模式">
                    <OptionPills
                      value={theme}
                      options={[
                        { value: 'system', label: '跟随系统' },
                        { value: 'light', label: '浅色' },
                        { value: 'dark', label: '深色' },
                      ]}
                      onChange={(value) => void updateSettings({ theme: value as AppTheme })}
                    />
                  </Field>
                  <Field label="内容宽度" description="调整主时间线在大屏幕上的宽度">
                    <OptionPills
                      value={contentWidth}
                      options={[
                        { value: 'standard', label: '标准' },
                        { value: 'wide', label: '宽' },
                        { value: 'wider', label: '更宽' },
                      ]}
                      onChange={(value) =>
                        void updateSettings({ contentWidth: value as ContentWidth })
                      }
                    />
                  </Field>
                  <StackedField
                    label="微博操作顺序"
                    description="拖动调整评论、转发、点赞三个主操作的位置"
                  >
                    <Reorder.Group
                      axis="x"
                      values={feedPrimaryActionOrder}
                      onReorder={handlePrimaryActionOrderChange}
                      className="grid grid-cols-3 gap-2"
                    >
                      {feedPrimaryActionOrder.map((id) => {
                        const option = PRIMARY_ACTION_OPTIONS.find((item) => item.id === id)
                        if (!option) return null

                        return (
                          <Reorder.Item
                            key={id}
                            value={id}
                            className="border-border bg-background hover:bg-accent/50 flex cursor-grab items-center justify-between rounded-md border px-2.5 py-2 text-sm active:cursor-grabbing"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <option.icon className="size-4 shrink-0" />
                              <span className="truncate">{option.label}</span>
                            </span>
                            <GripVertical className="text-muted-foreground size-4 shrink-0" />
                          </Reorder.Item>
                        )
                      })}
                    </Reorder.Group>
                  </StackedField>
                  <StackedField
                    label="微博工具按钮"
                    description="勾选后直接显示在微博卡片上，未勾选则放入更多菜单"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      {TOOLBAR_BUTTON_OPTIONS.map((option) => (
                        <label
                          key={option.id}
                          className="border-border hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm"
                        >
                          <Checkbox
                            checked={feedToolbarButtonIds.includes(option.id)}
                            onCheckedChange={(checked) =>
                              handleToolbarButtonToggle(option.id, checked === true)
                            }
                          />
                          <option.icon className="size-4 shrink-0" />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </StackedField>
                  <StackedField label="页面可见性" description="控制在导航栏中显示哪些页面">
                    <TreeView
                      data={pageElementTreeData}
                      className="max-h-[200px] overflow-y-auto"
                      renderItem={renderTreeItem}
                    />
                  </StackedField>
                </div>
              </div>
            )}

            {activeGroup === 'theme' && (
              <SettingsThemePicker
                scrollContainerRef={settingsMainRef}
                selectedThemeType={selectedThemeType}
                selectedThemeId={selectedThemeId}
                userThemes={userThemes}
                onSelectPreset={handleSelectPresetTheme}
                onSelectUserTheme={handleSelectUserTheme}
                onAddCustomTheme={handleAddCustomTheme}
                onDeleteUserTheme={handleDeleteUserTheme}
                onUpdateUserTheme={(themeId, patch) => void updateUserTheme(themeId, patch)}
                onLightCssChange={handleLightCssChange}
                onDarkCssChange={handleDarkCssChange}
              />
            )}

            {activeGroup === 'personalize' && (
              <div className="space-y-3 px-6 py-4">
                <StackedField
                  label="微博卡片行为"
                  description="选择点击微博卡片和评论按钮后的打开方式"
                >
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
                    {FEED_INTERACTION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={feedInteractionMode === option.value}
                        onClick={() => void updateSettings({ feedInteractionMode: option.value })}
                        className={cn(
                          'border-border bg-background hover:bg-accent/30 rounded-lg border p-3 text-left transition-[box-shadow,border-color]',
                          feedInteractionMode === option.value &&
                            'border-primary ring-primary/30 ring-2',
                        )}
                      >
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </StackedField>
                <div>
                  <Field
                    label="暗色模式降低图片亮度"
                    description="降低小图亮度，减少深色模式下的刺眼感"
                  >
                    <Switch
                      checked={darkModeImageDim}
                      onCheckedChange={(checked) =>
                        void updateSettings({ darkModeImageDim: checked })
                      }
                    />
                  </Field>
                  <IllustrationPlaceholder>
                    <img
                      src={darkModeImageDimJpeg}
                      alt="暗色模式降低图片亮度效果"
                      className="h-auto w-full"
                    />
                  </IllustrationPlaceholder>
                </div>
                <div>
                  <Field
                    label="视频倍速记忆"
                    description="开启后，最近一次手动设置的倍速作为视频的默认倍速"
                  >
                    <Switch
                      checked={rememberPlaybackRate}
                      onCheckedChange={(checked) =>
                        void updateSettings({
                          rememberPlaybackRate: checked,
                          // 关闭时同步重置缓存为 1，确保下次开启从干净状态开始
                          ...(checked ? {} : { playbackRate: 1 }),
                        })
                      }
                    />
                  </Field>
                </div>
                <div>
                  <Field label="首页默认时间线" description="进入微博首页时，自动打开指定时间线">
                    <Select
                      value={firstLoadRedirect}
                      onValueChange={(value) =>
                        void updateSettings({
                          firstLoadRedirect: value as typeof firstLoadRedirect,
                        })
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="for-you">推荐</SelectItem>
                        <SelectItem value="following">我关注的</SelectItem>
                        <SelectItem value="special-follow">特别关注</SelectItem>
                        <SelectItem value="friend-circle">朋友圈</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div>
                  <Field label="转发链样式" description='将 "//@用户名:" 格式显示为引用卡片'>
                    <Switch
                      checked={renderReplyChainEnabled}
                      onCheckedChange={(checked) =>
                        void updateSettings({ renderReplyChainEnabled: checked })
                      }
                    />
                  </Field>
                  <IllustrationPlaceholder>
                    <img src={quoteChainsJpeg} alt="转发链样式效果" className="h-auto w-full" />
                  </IllustrationPlaceholder>
                </div>
                {renderReplyChainEnabled && (
                  <div>
                    <Field label="折叠转发链" description="转发链超过 2 条时，折叠中间内容">
                      <Switch
                        checked={collapseRepliesEnabled}
                        onCheckedChange={(checked) =>
                          void updateSettings({ collapseRepliesEnabled: checked })
                        }
                      />
                    </Field>
                    <IllustrationPlaceholder>
                      <img
                        src={collapseReplyChain}
                        alt="折叠转发链效果"
                        className="h-auto w-full"
                      />
                    </IllustrationPlaceholder>
                  </div>
                )}
              </div>
            )}

            {activeGroup === 'font' && (
              <div className="flex flex-col">
                <div className="bg-background sticky top-0 z-10 border-b px-6 py-4">
                  <FontPreviewCard />
                </div>

                <div className="divide-border/40 divide-y px-6 py-4">
                  <Field label="字体大小" description="微博正文和评论的字体大小">
                    <Select
                      value={fontSizeClass}
                      onValueChange={(v) =>
                        void updateSettings({ fontSizeClass: v as FontSizeClass })
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-sm">14px</SelectItem>
                        <SelectItem value="text-base">16px</SelectItem>
                        <SelectItem value="text-lg">18px</SelectItem>
                        <SelectItem value="text-xl">20px</SelectItem>
                        <SelectItem value="text-2xl">24px</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="字体粗细" description="微博正文和评论的字体粗细">
                    <Select
                      value={fontWeightClass}
                      onValueChange={(v) =>
                        void updateSettings({ fontWeightClass: v as FontWeightClass })
                      }
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="font-normal">400 标准</SelectItem>
                        <SelectItem value="font-medium">500 中等</SelectItem>
                        <SelectItem value="font-semibold">600 较粗</SelectItem>
                        <SelectItem value="font-bold">700 粗</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="字间距" description="字符之间的间距（中文正文建议标准）">
                    <Select
                      value={letterSpacingClass}
                      onValueChange={(v) =>
                        void updateSettings({ letterSpacingClass: v as LetterSpacingClass })
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tracking-tight">紧凑</SelectItem>
                        <SelectItem value="tracking-normal">标准</SelectItem>
                        <SelectItem value="tracking-wide">宽松</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="行高" description="文本行之间的间距">
                    <Select
                      value={lineHeightClass}
                      onValueChange={(v) =>
                        void updateSettings({ lineHeightClass: v as LineHeightClass })
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leading-snug">适中偏紧</SelectItem>
                        <SelectItem value="leading-normal">标准</SelectItem>
                        <SelectItem value="leading-relaxed">宽松</SelectItem>
                        <SelectItem value="leading-loose">更宽松</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field
                    label="字体样式"
                    description={
                      fontFamilyLoading
                        ? '正在下载远程字体…'
                        : '微博正文和评论的字体（远程字体首次使用需下载）'
                    }
                  >
                    <Select
                      value={fontFamilyClass}
                      disabled={fontFamilyLoading}
                      onValueChange={(v) => {
                        void handleFontFamilyChange(v)
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>本地字体</SelectLabel>
                          <SelectItem value="font-sans">默认无衬线</SelectItem>
                          <SelectItem value="font-serif">默认衬线</SelectItem>
                          <SelectItem value="font-simhei">黑体</SelectItem>
                          <SelectItem value="font-simsun">宋体</SelectItem>
                          <SelectItem value="font-kaiti">楷体</SelectItem>
                          <SelectItem value="font-fangsong">仿宋</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>远程 · 无衬线</SelectLabel>
                          {REMOTE_FONT_OPTIONS.filter((o) => o.group === 'sans').map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>远程 · 衬线 / 楷体</SelectLabel>
                          {REMOTE_FONT_OPTIONS.filter((o) => o.group === 'serif').map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={resetFontSettings}>
                      恢复默认
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeGroup === 'advanced' && (
              <div className="divide-border/40 divide-y px-6 py-4">
                <Field label="xb 用户评分" description="显示用户评分，并每小时同步一次分值">
                  <Switch
                    checked={ratingEnabled}
                    onCheckedChange={(checked) => void updateSettings({ ratingEnabled: checked })}
                  />
                </Field>
                <Field
                  label="话题页打开方式"
                  description="开启后使用 xb 话题页，关闭后跳转到微博原始话题页"
                >
                  <Switch
                    checked={xbTopicPage}
                    onCheckedChange={(checked) => void updateSettings({ xbTopicPage: checked })}
                  />
                </Field>
                <Field label="浏览历史条数" description="超过上限后自动删除最早的记录">
                  <OptionPills
                    value={String(browsingHistoryLimit)}
                    options={BROWSING_HISTORY_LIMIT_OPTIONS.map((limit) => ({
                      value: String(limit),
                      label: `${limit} 条`,
                    }))}
                    onChange={handleBrowsingHistoryLimitChange}
                  />
                </Field>
              </div>
            )}
          </main>
        </div>

        {version && (
          <div className="border-border/40 flex shrink-0 items-center justify-between border-t px-6 py-3">
            <a
              href="https://xb-extension.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground font-mono text-[11px] transition-colors"
            >
              xb v{version}
            </a>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/nnecec"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
              >
                @nnecec
              </a>
              <a
                href="https://github.com/nnecec/xb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        )}
      </DialogContentMaybeForced>
    </Dialog>
  )
}
