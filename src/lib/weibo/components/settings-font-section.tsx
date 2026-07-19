import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type {
  FontApplyScope,
  FontFamilyClass,
  FontSizeClass,
  FontWeightClass,
  LetterSpacingClass,
  LineHeightClass,
} from '@/lib/app-settings'
import { REMOTE_FONT_OPTIONS } from '@/lib/font-loader'

import { Field } from './settings-dialog-ui'
import { FontPreviewCard } from './settings-font-preview'

export function SettingsFontSection({
  fontSizeClass,
  fontWeightClass,
  letterSpacingClass,
  lineHeightClass,
  fontFamilyClass,
  fontApplyScope,
  fontFamilyLoading,
  handleFontFamilyChange,
  resetFontSettings,
  updateSettings,
}: {
  fontSizeClass: FontSizeClass
  fontWeightClass: FontWeightClass
  letterSpacingClass: LetterSpacingClass
  lineHeightClass: LineHeightClass
  fontFamilyClass: FontFamilyClass
  fontApplyScope: FontApplyScope
  fontFamilyLoading: boolean
  handleFontFamilyChange: (value: string) => void | Promise<void>
  resetFontSettings: () => void
  updateSettings: (patch: Record<string, unknown>) => void | Promise<void>
}) {
  return (
    <div className="flex flex-col">
      <div className="bg-background sticky top-0 z-10 border-b px-6 py-4">
        <FontPreviewCard />
      </div>

      <div className="divide-border/40 divide-y px-6 py-4">
        <Field label="字体大小" description="微博正文和评论的字体大小">
          <Select
            value={fontSizeClass}
            onValueChange={(v) => void updateSettings({ fontSizeClass: v as FontSizeClass })}
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
            onValueChange={(v) => void updateSettings({ fontWeightClass: v as FontWeightClass })}
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
            onValueChange={(v) => void updateSettings({ lineHeightClass: v as LineHeightClass })}
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
            fontFamilyLoading ? '正在下载远程字体…' : '选择字体族（远程字体首次使用需下载）'
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
        <Field
          label="应用到"
          description="正文：仅微博与评论。应用：界面 chrome 共用字族（字号/行高仍只作用于正文）"
        >
          <Select
            value={fontApplyScope}
            onValueChange={(v) => void updateSettings({ fontApplyScope: v as FontApplyScope })}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="content">正文</SelectItem>
              <SelectItem value="app">应用</SelectItem>
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
  )
}
