import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
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
import { submitComposeAction } from '@/lib/weibo/data/weibo-data'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import {
  optimisticallyIncrementStatusComments,
  restoreStatusCacheMutation,
} from '@/lib/weibo/queries/status-cache'

function getModalCopy(target: ComposeTarget) {
  if (target.mode === 'repost') {
    return {
      title: '转发微博',
      checkboxLabel: '同时评论原微博',
      submitLabel: '转发微博',
    }
  }

  return {
    title: target.kind === 'status' ? '回复微博' : '回复评论',
    checkboxLabel: '同时转发原微博',
    submitLabel: target.kind === 'status' ? '发布评论' : '回复评论',
  }
}

export function CommentModal({
  open,
  target,
  onOpenChange,
}: {
  open: boolean
  target: ComposeTarget | null
  onOpenChange: (open: boolean) => void
}) {
  if (!target) {
    return null
  }

  const formKey = `${target.kind}:${target.mode}:${target.statusId}:${target.targetCommentId ?? 'root'}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <CommentModalForm key={formKey} target={target} onOpenChange={onOpenChange} />
    </Dialog>
  )
}

function CommentModalForm({
  target,
  onOpenChange,
}: {
  target: ComposeTarget
  onOpenChange: (open: boolean) => void
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [alsoSecondaryAction, setAlsoSecondaryAction] = useState(false)
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: submitComposeAction,
    onMutate: () => {
      if (target.mode !== 'comment') return undefined

      return optimisticallyIncrementStatusComments(queryClient, target.statusId)
    },
    onSuccess: () => {
      toast.success(target.mode === 'repost' ? '微博已转发' : '评论已发布')
      onOpenChange(false)
      if (target.mode === 'comment') {
        void queryClient.invalidateQueries({
          queryKey: ['weibo', 'status-comments', target.statusId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['weibo', 'feed-comments', target.statusId],
        })
        void queryClient.invalidateQueries({
          queryKey: ['weibo', 'nested-comments'],
        })
      }
    },
    onError: (error, _vars, context) => {
      restoreStatusCacheMutation(queryClient, context)
      toast.error(error instanceof Error ? error.message : '发布失败，请稍后再试')
    },
  })

  const copy = getModalCopy(target)
  const isSubmitDisabled =
    mutation.isPending || (target.mode === 'comment' && text.trim().length === 0)

  return (
    <DialogContent
      className="sm:max-w-xl"
      onOpenAutoFocus={(e) => {
        e.preventDefault()
        textareaRef.current?.focus()
      }}
    >
      <DialogHeader>
        <DialogTitle>{copy.title}</DialogTitle>
        <DialogDescription>
          @{target.authorName} · {target.excerpt || '这条内容没有可预览的正文'}
        </DialogDescription>
      </DialogHeader>

      <div className="border-foreground/20 flex flex-col gap-2 rounded-xl border p-2">
        <Textarea
          ref={textareaRef}
          aria-label={target.mode === 'repost' ? '转发内容' : '评论内容'}
          className="h-32 resize-none rounded-lg border-none! bg-transparent! ring-transparent!"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={target.mode === 'repost' ? '补充转发内容' : '写下你的评论'}
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
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          关闭
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
          {mutation.isPending ? '发布中...' : copy.submitLabel}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
