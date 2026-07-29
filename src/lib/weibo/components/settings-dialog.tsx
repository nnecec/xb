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
} from 'lucide-react'
import { Reorder } from 'motion/react'
import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import { TreeView, type TreeDataItem } from '@/components/tree-view'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
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
  FeedPrimaryActionId,
  FeedToolbarButtonId,
  FontFamilyClass,
  UserTheme,
} from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { CUSTOM_THEME_PRESETS } from '@/lib/custom-theme'
import { isRemoteFont, loadFont, type RemoteFontFamily } from '@/lib/font-loader'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'

import {
  DialogContentMaybeForced,
  Field,
  OptionPills,
  SidebarItem,
  StackedField,
} from './settings-dialog-ui'
import { SettingsFontSection } from './settings-font-section'
import { SettingsPersonalizeSection } from './settings-personalize-section'
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
    fontApplyScope,
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
    autoLoadLongText,
    textOnlyFeed,
    theme,
    feedInteractionMode,
    feedPrimaryActionOrder,
    feedToolbarButtonIds,
    contentWidth,
    customContentWidth,
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
      fontApplyScope: s.fontApplyScope,
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
      autoLoadLongText: s.autoLoadLongText,
      textOnlyFeed: s.textOnlyFeed,
      theme: s.theme,
      feedInteractionMode: s.feedInteractionMode,
      feedPrimaryActionOrder: s.feedPrimaryActionOrder,
      feedToolbarButtonIds: s.feedToolbarButtonIds,
      contentWidth: s.contentWidth,
      customContentWidth: s.customContentWidth,
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
      fontApplyScope: DEFAULT_APP_SETTINGS.fontApplyScope,
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
                  <StackedField label="内容宽度" description="调整应用内容区域在大屏幕上的宽度">
                    <OptionPills
                      value={contentWidth}
                      options={[
                        { value: 'narrower', label: '更窄' },
                        { value: 'narrow', label: '窄' },
                        { value: 'standard', label: '标准' },
                        { value: 'wide', label: '宽' },
                        { value: 'wider', label: '更宽' },
                        { value: 'custom', label: '自定义' },
                      ]}
                      onChange={(value) =>
                        void updateSettings({ contentWidth: value as ContentWidth })
                      }
                    />
                    {contentWidth === 'custom' ? (
                      <div className="flex items-center gap-3 pt-1">
                        <Slider
                          min={800}
                          max={1600}
                          step={20}
                          value={[customContentWidth]}
                          aria-label="自定义内容宽度"
                          onValueChange={([value]) => {
                            if (value !== undefined) {
                              void updateSettings({ customContentWidth: value })
                            }
                          }}
                        />
                        <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
                          {customContentWidth}px
                        </output>
                      </div>
                    ) : null}
                  </StackedField>
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
              <SettingsPersonalizeSection
                feedInteractionMode={feedInteractionMode}
                darkModeImageDim={darkModeImageDim}
                autoLoadLongText={autoLoadLongText}
                textOnlyFeed={textOnlyFeed}
                rememberPlaybackRate={rememberPlaybackRate}
                firstLoadRedirect={firstLoadRedirect}
                renderReplyChainEnabled={renderReplyChainEnabled}
                collapseRepliesEnabled={collapseRepliesEnabled}
                updateSettings={updateSettings}
              />
            )}

            {activeGroup === 'font' && (
              <SettingsFontSection
                fontSizeClass={fontSizeClass}
                fontWeightClass={fontWeightClass}
                letterSpacingClass={letterSpacingClass}
                lineHeightClass={lineHeightClass}
                fontFamilyClass={fontFamilyClass}
                fontApplyScope={fontApplyScope}
                fontFamilyLoading={fontFamilyLoading}
                handleFontFamilyChange={handleFontFamilyChange}
                resetFontSettings={resetFontSettings}
                updateSettings={updateSettings}
              />
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
