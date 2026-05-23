import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { EmoticonPicker } from '@/lib/weibo/components/emoticon-picker'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import type { FeedItem } from '@/lib/weibo/models/feed'
import { submitComposeAction } from '@/lib/weibo/services/weibo-repository'

function getModalCopy(target: ComposeTarget) {
  if (target.mode === 'repost') {
    return {
      title: '转发微博',
      checkboxLabel: '同时回复',
      submitLabel: '转发',
    }
  }

  return {
    title: target.kind === 'status' ? '回复微博' : '回复评论',
    checkboxLabel: '同时转发',
    submitLabel: '发送',
  }
}

export function CommentModal({
  open,
  target,
  zIndex,
  onOpenChange,
}: {
  open: boolean
  target: ComposeTarget | null
  zIndex?: number
  onOpenChange: (open: boolean) => void
}) {
  if (!target) {
    return null
  }

  const formKey = `${target.kind}:${target.mode}:${target.statusId}:${target.targetCommentId ?? 'root'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CommentModalForm key={formKey} target={target} zIndex={zIndex} onOpenChange={onOpenChange} />
    </Dialog>
  )
}

function CommentModalForm({
  target,
  zIndex,
  onOpenChange,
}: {
  target: ComposeTarget
  zIndex?: number
  onOpenChange: (open: boolean) => void
}) {
  const [text, setText] = useState('')
  const [alsoSecondaryAction, setAlsoSecondaryAction] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: submitComposeAction,
    onMutate: () => {
      if (target.mode !== 'comment') return {}

      queryClient.cancelQueries({ queryKey: ['weibo'] })
      const previousItems = queryClient.getQueriesData({ queryKey: ['weibo'] })

      const statusId = target.statusId
      queryClient.setQueriesData({ queryKey: ['weibo'] }, (old) => {
        if (!old || typeof old !== 'object' || !('pages' in old)) return old
        const data = old as { pages: { items: FeedItem[] }[] }
        return {
          ...data,
          pages: data.pages.map((page) => ({
            ...page,
            items: page.items.map((item) => {
              if (item.id === statusId) {
                return {
                  ...item,
                  stats: { ...item.stats, comments: item.stats.comments + 1 },
                }
              }
              if (item.retweetedStatus?.id === statusId) {
                return {
                  ...item,
                  retweetedStatus: {
                    ...item.retweetedStatus,
                    stats: {
                      ...item.retweetedStatus.stats,
                      comments: item.retweetedStatus.stats.comments + 1,
                    },
                  },
                }
              }
              return item
            }),
          })),
        }
      })

      for (const key of queryClient
        .getQueryCache()
        .getAll()
        .map((q) => q.queryKey)) {
        if (!Array.isArray(key)) continue
        if (key[0] !== 'weibo' || key[1] !== 'status') continue
        const cached = queryClient.getQueryData(key)
        if (!cached || typeof cached !== 'object') continue
        const detail = cached as { status?: FeedItem }
        if (detail.status && detail.status.id === statusId) {
          queryClient.setQueryData(key, {
            ...detail,
            status: {
              ...detail.status,
              stats: { ...detail.status.stats, comments: detail.status.stats.comments + 1 },
            },
          })
        }
      }

      return { previousItems }
    },
    onSuccess: () => {
      toast.success(target.mode === 'repost' ? '转发成功' : '回复成功')
      onOpenChange(false)
      if (target.mode === 'comment') {
        void queryClient.invalidateQueries({
          queryKey: ['weibo', 'status-comments', target.statusId],
        })
      }
    },
    onError: (error, _vars, context) => {
      if (context?.previousItems) {
        for (const [queryKey, data] of context.previousItems) {
          queryClient.setQueryData(queryKey, data)
        }
      }
      toast.error(error instanceof Error ? error.message : '发送失败，请稍后重试')
    },
  })

  const copy = getModalCopy(target)
  const isSubmitDisabled =
    mutation.isPending || (target.mode === 'comment' && text.trim().length === 0)

  return (
    <DialogContent className="sm:max-w-xl" style={{ zIndex }} overlayStyle={{ zIndex }}>
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>
          @{target.authorName} · {target.excerpt || '没有可预览的内容'}
        </DialogDescription>
      </DialogHeader>

      <Textarea
        aria-label="回复内容"
        autoFocus
        className="min-h-32"
        value={text}
        onChange={(event) => setText(event.target.value)}
      />

      <div className="flex items-center justify-between gap-3">
        <EmoticonPicker onSelect={(item) => setText((value) => `${value}${item.phrase}`)} />

        <div className="flex gap-2">
          <Checkbox
            checked={alsoSecondaryAction}
            onCheckedChange={(checked: boolean) => setAlsoSecondaryAction(checked)}
            id="alsoSecondaryAction"
          />
          <Label htmlFor="alsoSecondaryAction">{copy.checkboxLabel}</Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          取消
        </Button>
        <Button
          type="button"
          disabled={isSubmitDisabled}
          onClick={() =>
            mutation.mutate({
              target,
              text,
              alsoSecondaryAction,
            })
          }
        >
          {mutation.isPending ? '发送中...' : copy.submitLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
