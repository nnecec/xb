import React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { FontFamilyClass, FontSize } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <Label>{label}</Label>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </div>
      {children}
    </div>
  )
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const fontSizeClass = useAppSettings((s) => s.fontSizeClass)
  const fontFamilyClass = useAppSettings((s) => s.fontFamilyClass)
  const showHotSearchCard = useAppSettings((s) => s.showHotSearchCard)
  const collapseRepliesEnabled = useAppSettings((s) => s.collapseRepliesEnabled)
  const setFontSizeClass = useAppSettings((s) => s.setFontSizeClass)
  const setFontFamilyClass = useAppSettings((s) => s.setFontFamilyClass)
  const setShowHotSearchCard = useAppSettings((s) => s.setShowHotSearchCard)
  const setCollapseRepliesEnabled = useAppSettings((s) => s.setCollapseRepliesEnabled)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>配置字体大小、字体样式和显示偏好</DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <Field label="字体大小" description="微博正文和评论的字体大小">
            <Select
              value={fontSizeClass}
              onValueChange={(value) => setFontSizeClass(value as FontSize)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text-sm">小</SelectItem>
                <SelectItem value="text-base">标准</SelectItem>
                <SelectItem value="text-lg">大</SelectItem>
                <SelectItem value="text-xl">更大</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="字体样式" description="微博正文和评论的字体">
            <Select
              value={fontFamilyClass}
              onValueChange={(value) => setFontFamilyClass(value as FontFamilyClass)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="font-sans">无衬线</SelectItem>
                <SelectItem value="font-serif">衬线</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="热搜卡片" description="在右侧边栏显示热搜内容">
            <Switch
              checked={showHotSearchCard}
              onCheckedChange={(checked) => setShowHotSearchCard(checked)}
            />
          </Field>

          <Field label="折叠中间回复" description="回复链超过2条时折叠中间内容">
            <Switch
              checked={collapseRepliesEnabled}
              onCheckedChange={(checked) => setCollapseRepliesEnabled(checked)}
            />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  )
}
