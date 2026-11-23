import { useState } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  clampColumnWidth,
  CUSTOM_COLUMN_WIDTH_MIN,
  type FlatAppSettings,
  type ColumnWidth,
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
  'columnWidth',
  'customColumnWidth',
  'motionPreference',
  'darkModeImageDim',
] as const satisfies readonly (keyof FlatAppSettings)[]

const WIDTH_OPTIONS = [
  { value: 'narrower', label: '更窄' },
  { value: 'narrow', label: '窄' },
  { value: 'standard', label: '标准' },
  { value: 'wide', label: '宽' },
  { value: 'wider', label: '更宽' },
  { value: 'custom', label: '自定义' },
] as const

function CustomColumnWidthInput({
  label,
  value,
  onCommit,
}: {
  label: string
  value: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? String(value)

  const commit = () => {
    const numeric = Number(shown)
    setDraft(null)
    if (!Number.isFinite(numeric)) return
    const next = clampColumnWidth(numeric)
    if (next !== value) onCommit(next)
  }

  return (
    <div className="flex items-center gap-1.5">
      <Input
        type="number"
        inputMode="numeric"
        min={CUSTOM_COLUMN_WIDTH_MIN}
        step={1}
        aria-label={label}
        value={shown}
        className="w-24 font-mono tabular-nums"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.currentTarget.blur()
          }
        }}
      />
      <span className="text-muted-foreground text-xs">px</span>
    </div>
  )
}

function WidthControl({
  label,
  description,
  value,
  customValue,
  customLabel,
  onValueChange,
  onCustomValueChange,
}: {
  label: string
  description: string
  value: string
  customValue: number
  customLabel: string
  onValueChange: (value: string) => void
  onCustomValueChange: (value: number) => void
}) {
  return (
    <Field label={label} description={description}>
      <div className="flex min-w-0 items-center justify-end gap-2">
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
          <CustomColumnWidthInput
            label={customLabel}
            value={customValue}
            onCommit={onCustomValueChange}
          />
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
      columnWidth: state.navigation.columnWidth,
      customColumnWidth: state.navigation.customColumnWidth,
      motionPreference: state.appearance.motionPreference,
      darkModeImageDim: state.appearance.darkModeImageDim,
    })),
  )
  const hasCustomColumnWidths = useWorkspace(
    (state) =>
      state.auxiliaryColumns.some((column) => column.width !== undefined) ||
      Object.keys(state.columnWidths).length > 0,
  )
  const resetColumnWidths = useWorkspace((state) => state.resetColumnWidths)
  return (
    <div className="flex flex-col">
      <SettingsPanel>
        <WidthControl
          label="列宽度"
          description="调整多列模式下每一列的宽度"
          value={settings.columnWidth}
          customValue={settings.customColumnWidth}
          customLabel="自定义列宽度"
          onValueChange={(value) =>
            void updateSettings({
              navigation: { columnWidth: value as ColumnWidth },
            })
          }
          onCustomValueChange={(value) =>
            void updateSettings({
              navigation: { customColumnWidth: value },
            })
          }
        />

        <Field label="重置列宽" description="忘记拖动调整过的列宽，改用上面的列宽度">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="outline" size="sm" disabled={!hasCustomColumnWidths}>
                重置
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>重置列宽度？</AlertDialogTitle>
                <AlertDialogDescription>
                  拖动调整过的列宽会被忘记，所有列改用当前的列宽度设置。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={() => void resetColumnWidths()}>重置</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              void updateSettings({
                appearance: { motionPreference: value as MotionPreference },
              })
            }
          />
        </Field>

        <Field label="暗色模式降低图片亮度" description="降低卡片缩略图亮度，打开原图后恢复正常">
          <Switch
            aria-label="暗色模式降低图片亮度"
            checked={settings.darkModeImageDim}
            onCheckedChange={(checked) =>
              void updateSettings({
                appearance: { darkModeImageDim: checked },
              })
            }
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
