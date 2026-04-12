import { useMutation } from '@tanstack/react-query'
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
import { EmoticonPicker } from '@/features/weibo/components/emoticon-picker'
import type { ComposeTarget } from '@/features/weibo/models/compose'
import { submitComposeAction } from '@/features/weibo/services/weibo-repository'

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
  const [text, setText] = useState('')
  const [alsoSecondaryAction, setAlsoSecondaryAction] = useState(false)
  const mutation = useMutation({
    mutationFn: submitComposeAction,
    meta: {
      invalidates: [['weibo']],
    },
    onSuccess: () => {
      toast.success(target.mode === 'repost' ? '转发成功' : '回复成功')
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '发送失败，请稍后重试')
    },
  })

  const copy = getModalCopy(target)
  const isSubmitDisabled = mutation.isPending || text.trim().length === 0

  return (
    <DialogContent className="sm:max-w-xl">
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
