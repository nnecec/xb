import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useAppSettings } from '@/lib/app-settings-store'
import type { FontSize } from '@/lib/app-settings'

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
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
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
  const fontSize = useAppSettings((s) => s.fontSize)
  const fontFamily = useAppSettings((s) => s.fontFamily)
  const showHotSearchCard = useAppSettings((s) => s.showHotSearchCard)
  const setFontSize = useAppSettings((s) => s.setFontSize)
  const setFontFamily = useAppSettings((s) => s.setFontFamily)
  const setShowHotSearchCard = useAppSettings((s) => s.setShowHotSearchCard)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>设置</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <Field
            label="字体大小"
            description="微博正文和评论的字体大小"
          >
            <Select
              value={fontSize}
              onValueChange={(value) => setFontSize(value as FontSize)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">小</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="large">大</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="字体样式"
            description="微博正文和评论的字体"
          >
            <Select
              value={fontFamily}
              onValueChange={(value) => setFontFamily(value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system-ui, -apple-system, sans-serif">系统默认</SelectItem>
                <SelectItem value="'PingFang SC', 'Hiragino Sans GB', sans-serif">苹方</SelectItem>
                <SelectItem value="'Microsoft YaHei', sans-serif">微软雅黑</SelectItem>
                <SelectItem value="Georgia, serif">衬线体</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="热搜卡片"
            description="在右侧边栏显示热搜内容"
          >
            <Switch
              checked={showHotSearchCard}
              onCheckedChange={(checked) => setShowHotSearchCard(checked)}
            />
          </Field>
        </div>
      </DialogContent>
    </Dialog>
  )
}
