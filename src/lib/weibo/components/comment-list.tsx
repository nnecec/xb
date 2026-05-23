import { DARK_BG_PRESETS, LIGHT_BG_PRESETS, resolveIsDarkMode } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
import { CommentCard } from '@/lib/weibo/components/comment-card'
import { PageEmptyState } from '@/lib/weibo/components/page-state'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import type { CommentItem } from '@/lib/weibo/models/status'

export function CommentList({
  comments,
  emptyLabel,
  rootStatusId,
  authorUid,
  onCommentReply,
}: {
  comments: CommentItem[]
  emptyLabel: string
  rootStatusId: string
  authorUid?: string
  onCommentReply?: (target: ComposeTarget) => void
}) {
  const glassOpacity = useAppSettings((s) => s.glassOpacity)
  const glassBlur = useAppSettings((s) => s.glassBlur)
  const theme = useAppSettings((s) => s.theme)
  const lightModeBgColor = useAppSettings((s) => s.lightModeBgColor)
  const darkModeBgColor = useAppSettings((s) => s.darkModeBgColor)

  const isDark = resolveIsDarkMode(theme, window.matchMedia('(prefers-color-scheme: dark)').matches)
  const preset = isDark
    ? DARK_BG_PRESETS.find((p) => p.key === darkModeBgColor)
    : LIGHT_BG_PRESETS.find((p) => p.key === lightModeBgColor)

  const cardColor = preset?.card ?? 'oklch(0.98 0 0)'

  if (comments.length === 0) {
    return <PageEmptyState label={emptyLabel} />
  }

  return (
    <div className="flex flex-col gap-3">
      {comments.map((item) => (
        <div key={item.id} className="relative rounded-xl p-4">
          <div
            className="absolute inset-0 rounded-xl"
            style={{
              backgroundColor: cardColor,
              backdropFilter: `blur(${glassBlur}px)`,
              opacity: glassOpacity / 100,
            }}
          />
          <div className="relative z-10">
            <CommentCard
              item={item}
              rootStatusId={rootStatusId}
              authorUid={authorUid}
              onCommentReply={onCommentReply}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
