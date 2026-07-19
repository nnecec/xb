import { useState, type MouseEvent } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { StatusText } from '@/lib/weibo/components/status-text'
import { useFontSettings } from '@/lib/weibo/hooks/use-font-settings'
import type { FeedItem } from '@/lib/weibo/models/feed'

export function FeedTextBlock({
  item,
  canLoadLongText,
  isLongTextLoading,
  hasLongTextError,
  onLoadLongText,
}: {
  item: FeedItem
  canLoadLongText: boolean
  isLongTextLoading: boolean
  hasLongTextError: boolean
  onLoadLongText: () => void
}) {
  const { textClassName } = useFontSettings()
  const [textMode, setTextMode] = useState<'markdown' | 'plain'>('markdown')
  const canRenderMarkdown = Boolean(item.isMarkdown && item.markdownText)
  const resolvedTextMode = canRenderMarkdown ? textMode : 'plain'

  return (
    <div className={cn('text-foreground', textClassName)}>
      <StatusText item={item} text={item.text} mode={resolvedTextMode} />

      {canLoadLongText ? (
        <LongTextButton
          onClick={(event) => {
            event.stopPropagation()
            onLoadLongText()
          }}
          isLoading={isLongTextLoading}
          hasError={hasLongTextError}
        />
      ) : null}

      {canRenderMarkdown ? (
        <Button
          type="button"
          variant="link"
          size="xs"
          className="text-muted-foreground h-auto px-0 py-1 text-xs"
          onClick={(event) => {
            event.stopPropagation()
            setTextMode((mode) => (mode === 'markdown' ? 'plain' : 'markdown'))
          }}
        >
          {textMode === 'markdown' ? '查看原文' : '查看渲染'}
        </Button>
      ) : null}
    </div>
  )
}

function LongTextButton({
  onClick,
  isLoading,
  hasError,
}: {
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  isLoading: boolean
  hasError: boolean
}) {
  const label = isLoading ? '加载全文' : hasError ? '重试全文' : '阅读全文'

  return (
    <Button
      type="button"
      variant={hasError ? 'destructive' : 'secondary'}
      className={cn(isLoading && 'cursor-wait')}
      onClick={onClick}
      disabled={isLoading}
      aria-busy={isLoading}
    >
      {label}
    </Button>
  )
}
