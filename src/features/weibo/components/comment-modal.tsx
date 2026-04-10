import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ComposeTarget } from '@/features/weibo/models/compose'

import { EmoticonPicker } from '@/features/weibo/components/emoticon-picker'

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
  isSubmitting,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  target: ComposeTarget | null
  isSubmitting: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (payload: { text: string; alsoSecondaryAction: boolean }) => void
}) {
  const [text, setText] = useState('')
  const [alsoSecondaryAction, setAlsoSecondaryAction] = useState(false)

  useEffect(() => {
    setText('')
    setAlsoSecondaryAction(false)
  }, [open, target])

  if (!target) {
    return null
  }

  const copy = getModalCopy(target)
  const isSubmitDisabled = isSubmitting || text.trim().length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            @{target.authorName} · {target.excerpt || '没有可预览的内容'}
          </DialogDescription>
        </DialogHeader>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium">回复内容</span>
          <textarea
            aria-label="回复内容"
            autoFocus
            className="min-h-32 rounded-xl border bg-background px-3 py-2 text-sm outline-none"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <EmoticonPicker onSelect={(item) => setText((value) => `${value}${item.phrase}`)} />
          <label className="flex items-center gap-2 text-sm">
            <input
              checked={alsoSecondaryAction}
              type="checkbox"
              onChange={(event) => setAlsoSecondaryAction(event.target.checked)}
            />
            {copy.checkboxLabel}
          </label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            type="button"
            disabled={isSubmitDisabled}
            onClick={() => onSubmit({ text, alsoSecondaryAction })}
          >
            {isSubmitting ? '发送中...' : copy.submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
