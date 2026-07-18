import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useFontSettings } from '@/lib/weibo/hooks/use-font-settings'

export function FontPreviewCard() {
  const { textClassName, loadStatus, isRemote } = useFontSettings()

  return (
    <div className="bg-muted/30 rounded-xl p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <div className="bg-muted-foreground/20 size-8 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="truncate text-sm font-semibold">用户名称</span>
          <Badge variant="secondary">22:00</Badge>
          {isRemote && loadStatus === 'loading' ? (
            <Badge variant="outline" className="text-muted-foreground">
              加载中
            </Badge>
          ) : null}
          {isRemote && loadStatus === 'error' ? (
            <Badge variant="outline" className="text-destructive">
              加载失败
            </Badge>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          textClassName,
          'mb-3',
          loadStatus === 'loading' && 'opacity-60',
          loadStatus === 'error' && 'opacity-50',
        )}
      >
        今天的天气真好，适合出去走走。分享一下最近拍的照片，大家觉得怎么样？
      </div>
    </div>
  )
}
