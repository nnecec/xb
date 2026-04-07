import type { FeedItem } from '@/features/weibo/models/feed'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function FeedCard({ item }: { item: FeedItem }) {
  return (
    <Card className="gap-4 rounded-[28px] border-border/70 bg-card/95 py-4 shadow-none">
      <CardHeader className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 px-4">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
          {item.author.name?.slice(0, 1).toUpperCase() || '?'}
        </div>
        <div className="flex min-w-0 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="truncate text-base">{item.author.name}</CardTitle>
            <Badge variant="secondary">{item.createdAtLabel || 'Unknown time'}</Badge>
          </div>
          <CardDescription className="text-xs">
            @{item.author.id || 'unknown-user'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-4">
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{item.text || 'No text content.'}</p>
        <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
          <div className="rounded-full bg-muted px-3 py-2">评论 {item.stats.comments}</div>
          <div className="rounded-full bg-muted px-3 py-2">转发 {item.stats.reposts}</div>
          <div className="rounded-full bg-muted px-3 py-2">点赞 {item.stats.likes}</div>
        </div>
      </CardContent>
    </Card>
  )
}
