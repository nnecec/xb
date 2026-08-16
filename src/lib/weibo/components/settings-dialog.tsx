import {
  Image,
  Info,
  ListOrdered,
  Monitor,
  PanelLeft,
  PanelsTopLeft,
  Palette,
  Rows3,
  Settings,
  Type,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  BROWSING_HISTORY_LIMIT_OPTIONS,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type AppTheme,
  type BrowsingHistoryLimit,
  type FontFamilyClass,
  type UserTheme,
} from '@/lib/app-settings'
import { type AppSettingsStoreState, useAppSettings, useShallow } from '@/lib/app-settings-store'
import { CUSTOM_THEME_PRESETS } from '@/lib/custom-theme'
import { isRemoteFont, loadFont, type RemoteFontFamily } from '@/lib/font-loader'
import { browsingHistoryStore } from '@/lib/weibo/hooks/use-browsing-history'

import { SettingsCardsSection, SettingsFeedSection } from './settings-content-section'
import {
  defaultsFor,
  DialogContentMaybeForced,
  Field,
  OptionPills,
  ResetSectionButton,
  SettingsPanel,
  SettingsSection,
  SidebarItem,
} from './settings-dialog-ui'
import { SettingsDisplaySection } from './settings-display-section'
import { SettingsFontSection } from './settings-font-section'
import { SettingsActionsSection, SettingsMediaSection } from './settings-media-actions-section'
import { SettingsNavigationSection } from './settings-navigation-section'
import { SettingsThemePicker } from './settings-theme-picker'

const SETTINGS_MODULES = [
  { id: 'display', label: '显示', icon: Monitor },
  { id: 'theme', label: '主题', icon: Palette },
  { id: 'font', label: '字体', icon: Type },
  { id: 'navigation', label: '导航布局', icon: PanelLeft },
  { id: 'feed', label: '信息流', icon: Rows3 },
  { id: 'cards', label: '卡片', icon: PanelsTopLeft },
  { id: 'media', label: '媒体', icon: Image },
  { id: 'actions', label: '操作', icon: ListOrdered },
  { id: 'advanced', label: '高级', icon: Settings },
  { id: 'about', label: '关于', icon: Info },
] as const

type SettingsModuleId = (typeof SETTINGS_MODULES)[number]['id']
type SaveStatus = 'idle' | 'saving' | 'error'

const THEME_SETTING_KEYS = [
  'theme',
  'customThemeLightCss',
  'customThemeDarkCss',
  'selectedThemeType',
  'selectedThemeId',
] as const satisfies readonly (keyof AppSettings)[]

const ADVANCED_SETTING_KEYS = [
  'ratingEnabled',
  'xbTopicPage',
  'browsingHistoryLimit',
] as const satisfies readonly (keyof AppSettings)[]

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Force mount the dialog content even when closed (used for tests / animation). */
  forceMount?: boolean
}

export function SettingsDialog({ open, onOpenChange, forceMount = false }: SettingsDialogProps) {
  const [version, setVersion] = useState('')
  const [activeModule, setActiveModule] = useState<SettingsModuleId>('display')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [fontFamilyLoading, setFontFamilyLoading] = useState(false)
  const settingsMainRef = useRef<HTMLElement>(null)
  const saveSequenceRef = useRef(0)
  const retrySaveRef = useRef<(() => void) | null>(null)

  const {
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
    updateUserTheme,
  } = useAppSettings(
    useShallow((state) => ({
      theme: state.theme,
      xbTopicPage: state.xbTopicPage,
      ratingEnabled: state.ratingEnabled,
      selectedThemeType: state.selectedThemeType,
      selectedThemeId: state.selectedThemeId,
      userThemes: state.userThemes,
      customThemeLightCss: state.customThemeLightCss,
      customThemeDarkCss: state.customThemeDarkCss,
      browsingHistoryLimit: state.browsingHistoryLimit,
      updateSettings: state.updateSettings,
      updateUserTheme: state.updateUserTheme,
    })),
  )

  useEffect(() => {
    if (typeof browser !== 'undefined' && browser.runtime?.getManifest) {
      setVersion(browser.runtime.getManifest().version)
    }
  }, [])

  const runTrackedSave = useCallback(async (operation: () => Promise<void>) => {
    const sequence = ++saveSequenceRef.current
    setSaveStatus('saving')
    retrySaveRef.current = null

    try {
      await operation()
      if (sequence === saveSequenceRef.current) setSaveStatus('idle')
    } catch {
      if (sequence !== saveSequenceRef.current) return

      retrySaveRef.current = () => void runTrackedSave(operation)
      setSaveStatus('error')
    }
  }, [])

  const trackedUpdateSettings = useCallback<AppSettingsStoreState['updateSettings']>(
    async (patch) => {
      await runTrackedSave(() => updateSettings(patch))
    },
    [runTrackedSave, updateSettings],
  )

  function selectModule(module: SettingsModuleId) {
    setActiveModule(module)
    settingsMainRef.current?.scrollTo?.({ top: 0, behavior: 'instant' })
  }

  async function handleFontFamilyChange(value: string) {
    const next = value as FontFamilyClass
    if (!isRemoteFont(next)) {
      await trackedUpdateSettings({ fontFamilyClass: next })
      return
    }

    setFontFamilyLoading(true)
    try {
      const loaded = await loadFont(next as RemoteFontFamily)
      if (!loaded) {
        toast.error('字体加载失败，请检查网络后重试')
        return
      }
      await trackedUpdateSettings({ fontFamilyClass: next })
    } finally {
      setFontFamilyLoading(false)
    }
  }

  function handleSelectPresetTheme(presetKey: string) {
    const preset = CUSTOM_THEME_PRESETS.find((item) => item.key === presetKey)
    void trackedUpdateSettings({
      selectedThemeType: 'preset',
      selectedThemeId: presetKey,
      ...(preset
        ? { customThemeLightCss: preset.lightCss, customThemeDarkCss: preset.darkCss }
        : {}),
    })
  }

  function handleSelectUserTheme(themeId: string) {
    const selectedTheme = userThemes.find((item) => item.id === themeId)
    if (!selectedTheme) return

    void trackedUpdateSettings({
      selectedThemeType: 'custom',
      selectedThemeId: themeId,
      customThemeLightCss: selectedTheme.lightCss,
      customThemeDarkCss: selectedTheme.darkCss,
    })
  }

  function handleAddCustomTheme(): string {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const count = userThemes.filter((item) => item.name.startsWith('自定义主题')).length + 1
    const newTheme: UserTheme = {
      id,
      name: `自定义主题 ${count}`,
      lightCss: customThemeLightCss,
      darkCss: customThemeDarkCss,
    }

    void trackedUpdateSettings({
      userThemes: [...userThemes, newTheme],
      selectedThemeType: 'custom',
      selectedThemeId: id,
    })
    return id
  }

  function handleDeleteUserTheme(themeId: string) {
    const defaultPreset = CUSTOM_THEME_PRESETS.find((item) => item.key === 'default')
    void trackedUpdateSettings({
      userThemes: userThemes.filter((item) => item.id !== themeId),
      ...(selectedThemeType === 'custom' && selectedThemeId === themeId
        ? {
            selectedThemeType: 'preset',
            selectedThemeId: 'default',
            ...(defaultPreset
              ? {
                  customThemeLightCss: defaultPreset.lightCss,
                  customThemeDarkCss: defaultPreset.darkCss,
                }
              : {}),
          }
        : {}),
    })
  }

  function resetThemeSettings() {
    const defaultPreset = CUSTOM_THEME_PRESETS.find(
      (item) => item.key === DEFAULT_APP_SETTINGS.selectedThemeId,
    )
    void trackedUpdateSettings({
      ...defaultsFor(THEME_SETTING_KEYS),
      ...(defaultPreset
        ? {
            customThemeLightCss: defaultPreset.lightCss,
            customThemeDarkCss: defaultPreset.darkCss,
          }
        : {}),
    })
  }

  function handleBrowsingHistoryLimitChange(value: string) {
    const limit = Number(value) as BrowsingHistoryLimit
    void runTrackedSave(async () => {
      await updateSettings({ browsingHistoryLimit: limit })
      browsingHistoryStore.getState().trimToLimit(limit)
    })
  }

  function resetAdvancedSettings() {
    void runTrackedSave(async () => {
      await updateSettings(defaultsFor(ADVANCED_SETTING_KEYS))
      browsingHistoryStore.getState().trimToLimit(DEFAULT_APP_SETTINGS.browsingHistoryLimit)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContentMaybeForced forceMount={forceMount}>
        <DialogHeader className="flex h-14 shrink-0 flex-row items-center border-b px-5 pe-12 text-left">
          <DialogTitle className="text-base tracking-tight">设置</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>调整 xb 的显示、主题、字体、导航和阅读行为。</DialogDescription>
          </VisuallyHidden>
          <div className="ms-auto flex min-h-8 items-center" aria-live="polite">
            {saveStatus === 'saving' ? (
              <span role="status" className="text-muted-foreground text-xs">
                正在保存…
              </span>
            ) : null}
            {saveStatus === 'error' ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => retrySaveRef.current?.()}
              >
                保存失败，重试
              </Button>
            ) : null}
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden w-48 shrink-0 border-r p-3 md:block" aria-label="设置模块">
            <nav className="flex flex-col gap-0.5">
              {SETTINGS_MODULES.map((module) => (
                <SidebarItem
                  key={module.id}
                  icon={module.icon}
                  label={module.label}
                  active={activeModule === module.id}
                  onClick={() => selectModule(module.id)}
                />
              ))}
            </nav>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 border-b px-4 py-3 md:hidden">
              <Select
                value={activeModule}
                onValueChange={(value) => selectModule(value as SettingsModuleId)}
              >
                <SelectTrigger className="w-full" aria-label="当前设置模块">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {SETTINGS_MODULES.map((module) => (
                      <SelectItem key={module.id} value={module.id}>
                        {module.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <main
              ref={settingsMainRef}
              className="h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain"
            >
              {activeModule === 'display' ? (
                <SettingsDisplaySection updateSettings={trackedUpdateSettings} />
              ) : null}

              {activeModule === 'theme' ? (
                <div className="flex flex-col">
                  <SettingsPanel>
                    <Field label="明暗模式" description="自动模式会跟随系统外观变化">
                      <OptionPills
                        label="明暗模式"
                        value={theme}
                        options={[
                          { value: 'system', label: '跟随系统' },
                          { value: 'light', label: '浅色' },
                          { value: 'dark', label: '深色' },
                        ]}
                        onChange={(value) =>
                          void trackedUpdateSettings({ theme: value as AppTheme })
                        }
                      />
                    </Field>
                  </SettingsPanel>
                  <SettingsThemePicker
                    scrollContainerRef={settingsMainRef}
                    selectedThemeType={selectedThemeType}
                    selectedThemeId={selectedThemeId}
                    userThemes={userThemes}
                    onSelectPreset={handleSelectPresetTheme}
                    onSelectUserTheme={handleSelectUserTheme}
                    onAddCustomTheme={handleAddCustomTheme}
                    onDeleteUserTheme={handleDeleteUserTheme}
                    onUpdateUserTheme={(themeId, patch) =>
                      void runTrackedSave(() => updateUserTheme(themeId, patch))
                    }
                  />
                  <div className="px-6 pb-5">
                    <ResetSectionButton
                      label="主题"
                      keys={THEME_SETTING_KEYS}
                      onReset={resetThemeSettings}
                    />
                  </div>
                </div>
              ) : null}

              {activeModule === 'font' ? (
                <SettingsFontSection
                  fontFamilyLoading={fontFamilyLoading}
                  handleFontFamilyChange={handleFontFamilyChange}
                  updateSettings={trackedUpdateSettings}
                />
              ) : null}

              {activeModule === 'navigation' ? (
                <SettingsNavigationSection updateSettings={trackedUpdateSettings} />
              ) : null}

              {activeModule === 'feed' ? (
                <SettingsFeedSection updateSettings={trackedUpdateSettings} />
              ) : null}

              {activeModule === 'cards' ? (
                <SettingsCardsSection
                  scrollContainerRef={settingsMainRef}
                  updateSettings={trackedUpdateSettings}
                />
              ) : null}

              {activeModule === 'media' ? (
                <SettingsMediaSection updateSettings={trackedUpdateSettings} />
              ) : null}

              {activeModule === 'actions' ? (
                <SettingsActionsSection updateSettings={trackedUpdateSettings} />
              ) : null}

              {activeModule === 'advanced' ? (
                <div className="flex flex-col">
                  <SettingsPanel>
                    <SettingsSection title="扩展能力">
                      <Field label="显示 xb 用户评分" description="显示评分，并每小时同步一次分值">
                        <Switch
                          aria-label="显示 xb 用户评分"
                          checked={ratingEnabled}
                          onCheckedChange={(checked) =>
                            void trackedUpdateSettings({ ratingEnabled: checked })
                          }
                        />
                      </Field>
                      <Field label="使用 xb 打开话题页" description="关闭后跳转到微博原始话题页">
                        <Switch
                          aria-label="使用 xb 打开话题页"
                          checked={xbTopicPage}
                          onCheckedChange={(checked) =>
                            void trackedUpdateSettings({ xbTopicPage: checked })
                          }
                        />
                      </Field>
                      <Field label="浏览历史容量" description="超过上限后自动删除最早的记录">
                        <OptionPills
                          label="浏览历史容量"
                          value={String(browsingHistoryLimit)}
                          options={BROWSING_HISTORY_LIMIT_OPTIONS.map((limit) => ({
                            value: String(limit),
                            label: `${limit} 条`,
                          }))}
                          onChange={handleBrowsingHistoryLimitChange}
                        />
                      </Field>
                    </SettingsSection>

                    <ResetSectionButton
                      label="高级"
                      keys={ADVANCED_SETTING_KEYS}
                      onReset={resetAdvancedSettings}
                    />
                  </SettingsPanel>
                </div>
              ) : null}

              {activeModule === 'about' ? (
                <SettingsPanel>
                  <AboutSection version={version} />
                </SettingsPanel>
              ) : null}
            </main>
          </div>
        </div>
      </DialogContentMaybeForced>
    </Dialog>
  )
}

function AboutSection({ version }: { version: string }) {
  return (
    <SettingsSection title="关于 xb">
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 py-2 text-sm">
        {version ? (
          <>
            <dt className="text-muted-foreground">版本</dt>
            <dd className="font-mono text-xs">v{version}</dd>
          </>
        ) : null}
        <dt className="text-muted-foreground">项目</dt>
        <dd className="flex flex-wrap gap-x-4 gap-y-2">
          <a
            href="https://xb-extension.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            xb 官网
          </a>
          <a
            href="https://github.com/nnecec/xb"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            GitHub
          </a>
        </dd>
        <dt className="text-muted-foreground">作者</dt>
        <dd>
          <a
            href="https://github.com/nnecec"
            target="_blank"
            rel="noopener noreferrer"
            className="underline-offset-4 hover:underline"
          >
            @nnecec
          </a>
        </dd>
      </dl>
    </SettingsSection>
  )
}
