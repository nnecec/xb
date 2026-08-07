import { Palette, Settings, SunMoon, Type } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { BROWSING_HISTORY_LIMIT_OPTIONS, DEFAULT_APP_SETTINGS } from '@/lib/app-settings'
import type { AppTheme, BrowsingHistoryLimit, FontFamilyClass, UserTheme } from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { CUSTOM_THEME_PRESETS } from '@/lib/custom-theme'
import { isRemoteFont, loadFont, type RemoteFontFamily } from '@/lib/font-loader'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'

import { SettingsAppearanceSection } from './settings-appearance-section'
import { DialogContentMaybeForced, Field, OptionPills, SidebarItem } from './settings-dialog-ui'
import { SettingsFontSection } from './settings-font-section'
import { SettingsThemePicker } from './settings-theme-picker'

const SIDEBAR_GROUPS = [
  { id: 'appearance' as const, label: '外观', icon: SunMoon },
  { id: 'theme' as const, label: '主题', icon: Palette },
  { id: 'font' as const, label: '字体', icon: Type },
  { id: 'advanced' as const, label: '高级', icon: Settings },
]

type GroupId = (typeof SIDEBAR_GROUPS)[number]['id']

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
    uiFontSize,
    contentFontSize,
    fontWeightClass,
    letterSpacingClass,
    lineHeightClass,
    fontFamilyClass,
    fontApplyScope,
    theme,
    xbTopicPage,
    ratingEnabled,
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
      uiFontSize: s.uiFontSize,
      contentFontSize: s.contentFontSize,
      fontWeightClass: s.fontWeightClass,
      letterSpacingClass: s.letterSpacingClass,
      lineHeightClass: s.lineHeightClass,
      fontFamilyClass: s.fontFamilyClass,
      fontApplyScope: s.fontApplyScope,
      theme: s.theme,
      xbTopicPage: s.xbTopicPage,
      ratingEnabled: s.ratingEnabled,
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
  useEffect(() => {
    if (typeof browser !== 'undefined' && browser.runtime?.getManifest) {
      setVersion(browser.runtime.getManifest().version)
    }
  }, [])

  const [fontFamilyLoading, setFontFamilyLoading] = useState(false)

  function resetFontSettings() {
    void updateSettings({
      uiFontSize: DEFAULT_APP_SETTINGS.uiFontSize,
      contentFontSize: DEFAULT_APP_SETTINGS.contentFontSize,
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
              <SettingsAppearanceSection scrollContainerRef={settingsMainRef} />
            )}

            {activeGroup === 'theme' && (
              <div className="flex flex-col">
                <div className="px-6 pt-4">
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
                </div>
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
              </div>
            )}

            {activeGroup === 'font' && (
              <SettingsFontSection
                uiFontSize={uiFontSize}
                contentFontSize={contentFontSize}
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
              className="text-muted-foreground hover:text-foreground font-mono text-xs transition-colors"
            >
              xb v{version}
            </a>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/nnecec"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
              >
                @nnecec
              </a>
              <a
                href="https://github.com/nnecec/xb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-xs transition-colors"
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
