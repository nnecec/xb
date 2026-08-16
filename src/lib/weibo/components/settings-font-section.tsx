import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  CONTENT_FONT_SIZE_OPTIONS,
  UI_FONT_SIZE_OPTIONS,
  type AppSettings,
  type ContentFontSize,
  type FontApplyScope,
  type FontWeightClass,
  type LetterSpacingClass,
  type LineHeightClass,
  type UiFontSize,
} from '@/lib/app-settings'
import { type AppSettingsStoreState, useAppSettings, useShallow } from '@/lib/app-settings-store'
import { REMOTE_FONT_OPTIONS } from '@/lib/font-loader'

import { defaultsFor, Field, ResetSectionButton, SettingsPanel } from './settings-dialog-ui'
import { FontPreviewCard } from './settings-font-preview'

const FONT_SETTING_KEYS = [
  'uiFontSize',
  'contentFontSize',
  'fontWeightClass',
  'letterSpacingClass',
  'lineHeightClass',
  'fontFamilyClass',
  'fontApplyScope',
] as const satisfies readonly (keyof AppSettings)[]

export function SettingsFontSection({
  fontFamilyLoading,
  handleFontFamilyChange,
  updateSettings,
}: {
  fontFamilyLoading: boolean
  handleFontFamilyChange: (value: string) => void | Promise<void>
  updateSettings: AppSettingsStoreState['updateSettings']
}) {
  const settings = useAppSettings(
    useShallow((state) => ({
      uiFontSize: state.uiFontSize,
      contentFontSize: state.contentFontSize,
      fontWeightClass: state.fontWeightClass,
      letterSpacingClass: state.letterSpacingClass,
      lineHeightClass: state.lineHeightClass,
      fontFamilyClass: state.fontFamilyClass,
      fontApplyScope: state.fontApplyScope,
    })),
  )

  return (
    <div className="flex flex-col">
      <div className="border-b px-6 py-4">
        <FontPreviewCard />
      </div>
      <SettingsPanel>
        <Field
          label="字体"
          description={fontFamilyLoading ? '正在下载远程字体…' : '远程字体首次使用时需要下载'}
        >
          <Select
            value={settings.fontFamilyClass}
            disabled={fontFamilyLoading}
            onValueChange={(value) => void handleFontFamilyChange(value)}
          >
            <SelectTrigger className="w-48" aria-label="字体">
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
                {REMOTE_FONT_OPTIONS.filter((option) => option.group === 'sans').map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>远程 · 衬线 / 楷体</SelectLabel>
                {REMOTE_FONT_OPTIONS.filter((option) => option.group === 'serif').map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field label="字体应用范围" description="界面字号与正文字号始终独立">
          <Select
            value={settings.fontApplyScope}
            onValueChange={(value) =>
              void updateSettings({ fontApplyScope: value as FontApplyScope })
            }
          >
            <SelectTrigger className="w-36" aria-label="字体应用范围">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="content">仅内容</SelectItem>
                <SelectItem value="app">整个 xb</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field label="界面字号" description="导航、按钮、菜单和设置中的文字">
          <Select
            value={String(settings.uiFontSize)}
            onValueChange={(value) =>
              void updateSettings({ uiFontSize: Number(value) as UiFontSize })
            }
          >
            <SelectTrigger className="w-28" aria-label="界面字号">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {UI_FONT_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field label="正文字号" description="微博正文和评论文字">
          <Select
            value={String(settings.contentFontSize)}
            onValueChange={(value) =>
              void updateSettings({ contentFontSize: Number(value) as ContentFontSize })
            }
          >
            <SelectTrigger className="w-28" aria-label="正文字号">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {CONTENT_FONT_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <Field label="字体粗细">
          <Select
            value={settings.fontWeightClass}
            onValueChange={(value) =>
              void updateSettings({ fontWeightClass: value as FontWeightClass })
            }
          >
            <SelectTrigger className="w-32" aria-label="字体粗细">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="font-normal">400 标准</SelectItem>
                <SelectItem value="font-medium">500 中等</SelectItem>
                <SelectItem value="font-semibold">600 较粗</SelectItem>
                <SelectItem value="font-bold">700 粗</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field label="字间距" description="中文正文建议使用标准">
          <Select
            value={settings.letterSpacingClass}
            onValueChange={(value) =>
              void updateSettings({ letterSpacingClass: value as LetterSpacingClass })
            }
          >
            <SelectTrigger className="w-28" aria-label="字间距">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="tracking-tight">紧凑</SelectItem>
                <SelectItem value="tracking-normal">标准</SelectItem>
                <SelectItem value="tracking-wide">宽松</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
        <Field label="行高" description="只影响文字行距，不改变微博卡片间距">
          <Select
            value={settings.lineHeightClass}
            onValueChange={(value) =>
              void updateSettings({ lineHeightClass: value as LineHeightClass })
            }
          >
            <SelectTrigger className="w-32" aria-label="行高">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="leading-snug">适中偏紧</SelectItem>
                <SelectItem value="leading-normal">标准</SelectItem>
                <SelectItem value="leading-relaxed">宽松</SelectItem>
                <SelectItem value="leading-loose">更宽松</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>

        <ResetSectionButton
          label="字体"
          keys={FONT_SETTING_KEYS}
          onReset={() => void updateSettings(defaultsFor(FONT_SETTING_KEYS))}
        />
      </SettingsPanel>
    </div>
  )
}
