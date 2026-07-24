import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { EmoticonPicker } from '@/lib/weibo/components/emoticon-picker'
import { submitComposeAction } from '@/lib/weibo/data/weibo-data'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import {
  optimisticallyIncrementStatusComments,
  restoreStatusCacheMutation,
} from '@/lib/weibo/queries/status-cache'

interface CommentBoxProps {
  target: ComposeTarget
  placeholder?: string
  onSubmitSuccess?: () => void
  compact?: boolean
}

export function CommentBox({
  target,
  placeholder,
  onSubmitSuccess,
  compact = false,
}: CommentBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')
  const [alsoSecondaryAction, setAlsoSecondaryAction] = useState(false)
  const queryClient = useQueryClient()

  const isRepost = target.mode === 'repost'
  const checkboxLabel = isRepost ? '同时评论原微博' : '同时转发原微博'
  const submitLabel = isRepost ? '转发微博' : '发布评论'

  const mutation = useMutation({
    mutationFn: submitComposeAction,
    onMutate: () => {
      if (target.mode !== 'comment') return undefined
      return optimisticallyIncrementStatusComments(queryClient, target.statusId)
    },
    onSuccess: () => {
      toast.success(isRepost ? '微博已转发' : '评论已发布')
      setText('')
      setAlsoSecondaryAction(false)
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
      onSubmitSuccess?.()
    },
    onError: (error, _vars, context) => {
      restoreStatusCacheMutation(queryClient, context)
      toast.error(error instanceof Error ? error.message : '发布失败，请稍后再试')
    },
  })

  const isSubmitDisabled =
    mutation.isPending || (target.mode === 'comment' && text.trim().length === 0)

  const handleSubmit = () => {
    mutation.mutate({
      target,
      text,
      alsoSecondaryAction,
    })
  }

  return (
    <div className="border-foreground/20 flex flex-col gap-2 rounded-xl border p-2">
      <Textarea
        ref={textareaRef}
        aria-label={isRepost ? '转发内容' : '评论内容'}
        placeholder={placeholder || (isRepost ? '补充转发内容' : '写下你的评论')}
        className={cn(
          'rounded-lg bg-transparent! ring-transparent! border-none! resize-none',
          compact ? 'h-12' : 'h-16',
        )}
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            if (!isSubmitDisabled) {
              handleSubmit()
            }
          }
        }}
      />

      <div className="flex items-center justify-between gap-2">
        <EmoticonPicker onSelect={(item) => setText((value) => `${value}${item.phrase}`)} />

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Checkbox
              checked={alsoSecondaryAction}
              onCheckedChange={(checked: boolean) => setAlsoSecondaryAction(checked)}
              id={`alsoSecondaryAction-${target.statusId}`}
            />
            <Label
              htmlFor={`alsoSecondaryAction-${target.statusId}`}
              className="text-muted-foreground text-xs"
            >
              {checkboxLabel}
            </Label>
          </div>

          <Button type="button" size="sm" disabled={isSubmitDisabled} onClick={handleSubmit}>
            {mutation.isPending ? '发布中...' : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
