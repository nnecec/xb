import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  CUSTOM_CONTENT_WIDTH_MAX,
  CUSTOM_CONTENT_WIDTH_MIN,
  CUSTOM_CONTENT_WIDTH_STEP,
  type AppSettings,
  type ContentWidth,
  type MotionPreference,
} from '@/lib/app-settings'
import { type AppSettingsStoreState, useAppSettings, useShallow } from '@/lib/app-settings-store'

import {
  defaultsFor,
  Field,
  OptionPills,
  ResetSectionButton,
  SettingsPanel,
} from './settings-dialog-ui'

const DISPLAY_SETTING_KEYS = [
  'contentWidth',
  'customContentWidth',
  'motionPreference',
  'darkModeImageDim',
] as const satisfies readonly (keyof AppSettings)[]

export function SettingsDisplaySection({
  updateSettings,
}: {
  updateSettings: AppSettingsStoreState['updateSettings']
}) {
  const settings = useAppSettings(
    useShallow((state) => ({
      contentWidth: state.contentWidth,
      customContentWidth: state.customContentWidth,
      motionPreference: state.motionPreference,
      darkModeImageDim: state.darkModeImageDim,
    })),
  )

  return (
    <div className="flex flex-col">
      <SettingsPanel>
        <Field label="内容宽度" description="调整应用内容区域在大屏幕上的宽度">
          <div
            className={`flex min-w-0 flex-col items-end gap-2 ${
              settings.contentWidth === 'custom' ? 'w-72' : 'w-fit'
            }`}
          >
            <Select
              value={settings.contentWidth}
              onValueChange={(value) =>
                void updateSettings({ contentWidth: value as ContentWidth })
              }
            >
              <SelectTrigger className="w-fit" aria-label="内容宽度">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="narrower">更窄</SelectItem>
                  <SelectItem value="narrow">窄</SelectItem>
                  <SelectItem value="standard">标准</SelectItem>
                  <SelectItem value="wide">宽</SelectItem>
                  <SelectItem value="wider">更宽</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            {settings.contentWidth === 'custom' ? (
              <div className="flex w-full items-center gap-3 pt-1">
                <Slider
                  min={CUSTOM_CONTENT_WIDTH_MIN}
                  max={CUSTOM_CONTENT_WIDTH_MAX}
                  step={CUSTOM_CONTENT_WIDTH_STEP}
                  value={[settings.customContentWidth]}
                  aria-label="自定义内容宽度"
                  onValueChange={([value]) => {
                    if (value !== undefined) void updateSettings({ customContentWidth: value })
                  }}
                />
                <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
                  {settings.customContentWidth}px
                </output>
              </div>
            ) : null}
          </div>
        </Field>

        <Field label="动态效果" description="控制 xb 动画是否跟随系统的减少动态效果设置">
          <OptionPills
            label="动态效果"
            value={settings.motionPreference}
            options={[
              { value: 'system', label: '跟随系统' },
              { value: 'full', label: '完整' },
              { value: 'reduced', label: '减少' },
            ]}
            onChange={(value) =>
              void updateSettings({ motionPreference: value as MotionPreference })
            }
          />
        </Field>

        <Field label="暗色模式降低图片亮度" description="降低卡片缩略图亮度，打开原图后恢复正常">
          <Switch
            aria-label="暗色模式降低图片亮度"
            checked={settings.darkModeImageDim}
            onCheckedChange={(checked) => void updateSettings({ darkModeImageDim: checked })}
          />
        </Field>

        <ResetSectionButton
          label="显示"
          keys={DISPLAY_SETTING_KEYS}
          onReset={() => void updateSettings(defaultsFor(DISPLAY_SETTING_KEYS))}
        />
      </SettingsPanel>
    </div>
  )
}
