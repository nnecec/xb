import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { type AppSettings, type HomeTab } from '@/lib/app-settings'
import { type AppSettingsStoreState, useAppSettings, useShallow } from '@/lib/app-settings-store'

import {
  defaultsFor,
  Field,
  ResetSectionButton,
  SettingsPanel,
  SettingsSection,
} from './settings-dialog-ui'

const LEFT_NAVIGATION_ITEMS = [
  { key: 'showExplore', label: '探索' },
  { key: 'showFavorites', label: '收藏' },
  { key: 'showHistory', label: '历史' },
  { key: 'showNotifications', label: '通知' },
  { key: 'showDMs', label: '私信' },
  { key: 'showProfile', label: '我的' },
  { key: 'showCompose', label: '发微博' },
] as const satisfies ReadonlyArray<{ key: keyof AppSettings; label: string }>

const NAVIGATION_SETTING_KEYS = [
  ...LEFT_NAVIGATION_ITEMS.map((item) => item.key),
  'firstLoadRedirect',
] as const satisfies readonly (keyof AppSettings)[]

export function SettingsNavigationSection({
  updateSettings,
}: {
  updateSettings: AppSettingsStoreState['updateSettings']
}) {
  const settings = useAppSettings(
    useShallow((state) => ({
      showExplore: state.showExplore,
      showFavorites: state.showFavorites,
      showHistory: state.showHistory,
      showNotifications: state.showNotifications,
      showDMs: state.showDMs,
      showProfile: state.showProfile,
      showCompose: state.showCompose,
      firstLoadRedirect: state.firstLoadRedirect,
    })),
  )

  function updateBooleanSetting(key: keyof AppSettings, checked: boolean) {
    void updateSettings({ [key]: checked } as Partial<AppSettings>)
  }

  return (
    <div className="flex flex-col">
      <SettingsPanel>
        <SettingsSection title="首次打开">
          <Field label="首页默认时间线" description="仅在新打开微博首页时生效">
            <Select
              value={settings.firstLoadRedirect}
              onValueChange={(value) =>
                void updateSettings({ firstLoadRedirect: value as HomeTab })
              }
            >
              <SelectTrigger className="w-36" aria-label="首页默认时间线">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="for-you">推荐</SelectItem>
                  <SelectItem value="following">我关注的</SelectItem>
                  <SelectItem value="special-follow">特别关注</SelectItem>
                  <SelectItem value="friend-circle">朋友圈</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </Field>
        </SettingsSection>

        <SettingsSection title="左侧导航" description="主页和设置入口始终保留。">
          {LEFT_NAVIGATION_ITEMS.map((item) => (
            <Field key={item.key} label={item.label}>
              <Switch
                aria-label={`显示${item.label}`}
                checked={settings[item.key]}
                onCheckedChange={(checked) => updateBooleanSetting(item.key, checked)}
              />
            </Field>
          ))}
        </SettingsSection>

        <ResetSectionButton
          label="导航布局"
          keys={NAVIGATION_SETTING_KEYS}
          onReset={() => void updateSettings(defaultsFor(NAVIGATION_SETTING_KEYS))}
        />
      </SettingsPanel>
    </div>
  )
}
