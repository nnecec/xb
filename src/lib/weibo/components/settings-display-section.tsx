import { toast } from 'sonner'

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
  CUSTOM_COLUMN_WIDTH_MAX,
  CUSTOM_COLUMN_WIDTH_MIN,
  CUSTOM_COLUMN_WIDTH_STEP,
  CUSTOM_CONTENT_WIDTH_MAX,
  CUSTOM_CONTENT_WIDTH_MIN,
  CUSTOM_CONTENT_WIDTH_STEP,
  type AppSettings,
  type ColumnWidth,
  type ContentWidth,
  type MotionPreference,
} from '@/lib/app-settings'
import { type AppSettingsStoreState, useAppSettings, useShallow } from '@/lib/app-settings-store'
import { useWorkspace } from '@/lib/weibo/workspace/workspace-store'

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
  'columnWidth',
  'customColumnWidth',
  'motionPreference',
  'darkModeImageDim',
] as const satisfies readonly (keyof AppSettings)[]

const WIDTH_OPTIONS = [
  { value: 'narrower', label: '更窄' },
  { value: 'narrow', label: '窄' },
  { value: 'standard', label: '标准' },
  { value: 'wide', label: '宽' },
  { value: 'wider', label: '更宽' },
  { value: 'custom', label: '自定义' },
] as const

function WidthControl({
  label,
  description,
  value,
  customValue,
  customMin,
  customMax,
  customStep,
  customLabel,
  onValueChange,
  onCustomValueChange,
}: {
  label: string
  description: string
  value: string
  customValue: number
  customMin: number
  customMax: number
  customStep: number
  customLabel: string
  onValueChange: (value: string) => void
  onCustomValueChange: (value: number) => void
}) {
  return (
    <Field label={label} description={description}>
      <div
        className={`flex min-w-0 flex-col items-end gap-2 ${value === 'custom' ? 'w-72' : 'w-fit'}`}
      >
        <Select value={value} onValueChange={onValueChange}>
          <SelectTrigger className="w-fit" aria-label={label}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {WIDTH_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
        {value === 'custom' ? (
          <div className="flex w-full items-center gap-3 pt-1">
            <Slider
              min={customMin}
              max={customMax}
              step={customStep}
              value={[customValue]}
              aria-label={customLabel}
              onValueChange={([next]) => {
                if (next !== undefined) onCustomValueChange(next)
              }}
            />
            <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
              {customValue}px
            </output>
          </div>
        ) : null}
      </div>
    </Field>
  )
}

export function SettingsDisplaySection({
  updateSettings,
}: {
  updateSettings: AppSettingsStoreState['updateSettings']
}) {
  const settings = useAppSettings(
    useShallow((state) => ({
      contentWidth: state.contentWidth,
      customContentWidth: state.customContentWidth,
      columnWidth: state.columnWidth,
      customColumnWidth: state.customColumnWidth,
      motionPreference: state.motionPreference,
      darkModeImageDim: state.darkModeImageDim,
    })),
  )
  const multiColumnEnabled = useWorkspace((state) => state.enabled)
  const setMultiColumnEnabled = useWorkspace((state) => state.setEnabled)

  function updateMultiColumnEnabled(enabled: boolean) {
    void setMultiColumnEnabled(enabled).catch(() => toast.error('无法保存多列工作区配置'))
  }

  return (
    <div className="flex flex-col">
      <SettingsPanel>
        <Field label="启用多列模式" description="关闭后仍会保留已添加的列和顺序。">
          <Switch
            aria-label="启用多列模式"
            checked={multiColumnEnabled}
            onCheckedChange={updateMultiColumnEnabled}
          />
        </Field>

        {multiColumnEnabled ? (
          <WidthControl
            label="列宽度"
            description="调整多列模式下每一列的宽度"
            value={settings.columnWidth}
            customValue={settings.customColumnWidth}
            customMin={CUSTOM_COLUMN_WIDTH_MIN}
            customMax={CUSTOM_COLUMN_WIDTH_MAX}
            customStep={CUSTOM_COLUMN_WIDTH_STEP}
            customLabel="自定义列宽度"
            onValueChange={(value) => void updateSettings({ columnWidth: value as ColumnWidth })}
            onCustomValueChange={(value) => void updateSettings({ customColumnWidth: value })}
          />
        ) : (
          <WidthControl
            label="内容宽度"
            description="调整应用内容区域在大屏幕上的宽度"
            value={settings.contentWidth}
            customValue={settings.customContentWidth}
            customMin={CUSTOM_CONTENT_WIDTH_MIN}
            customMax={CUSTOM_CONTENT_WIDTH_MAX}
            customStep={CUSTOM_CONTENT_WIDTH_STEP}
            customLabel="自定义内容宽度"
            onValueChange={(value) => void updateSettings({ contentWidth: value as ContentWidth })}
            onCustomValueChange={(value) => void updateSettings({ customContentWidth: value })}
          />
        )}

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
          onReset={() => {
            void updateSettings(defaultsFor(DISPLAY_SETTING_KEYS))
            updateMultiColumnEnabled(false)
          }}
        />
      </SettingsPanel>
    </div>
  )
}
