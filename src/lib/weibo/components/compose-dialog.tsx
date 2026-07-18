import { useMutation } from '@tanstack/react-query'
import { ArrowUpRightIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { EmoticonPicker } from '@/lib/weibo/components/emoticon-picker'
import { publishWeiboStatus } from '@/lib/weibo/services/weibo-repository'

interface ComposeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ComposeDialog({ open, onOpenChange }: ComposeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <ComposeForm key={open ? 'open' : 'closed'} onClose={() => onOpenChange(false)} />
    </Dialog>
  )
}

function ComposeForm({ onClose }: { onClose: () => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [text, setText] = useState('')

  const openVideoUpload = () => {
    window.open('https://weibo.com/upload/channel', '_blank')
  }

  const mutation = useMutation({
    mutationFn: publishWeiboStatus,
    meta: {
      invalidates: [['weibo']],
    },
    onSuccess: () => {
      toast.success('微博已发布')
      onClose()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '发布失败，请稍后再试')
    },
  })

  const isSubmitDisabled = mutation.isPending || text.trim().length === 0

  return (
    <DialogContent
      className="sm:max-w-xl"
      onOpenAutoFocus={(e) => {
        e.preventDefault()
        textareaRef.current?.focus()
      }}
    >
      <DialogHeader>
        <DialogTitle>发布微博</DialogTitle>
        <DialogDescription>输入正文后发布到微博。</DialogDescription>
      </DialogHeader>

      <div className="border-foreground/20 flex flex-col gap-2 rounded-xl border p-2">
        <Textarea
          ref={textareaRef}
          aria-label="微博内容"
          className="h-32 resize-none rounded-lg border-none! bg-transparent! ring-transparent!"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="写下你想发布的内容"
        />

        <div className="flex items-center justify-between">
          <EmoticonPicker onSelect={(item) => setText((value) => `${value}${item.phrase}`)} />
          <Button type="button" size="sm" variant="ghost" onClick={openVideoUpload}>
            上传视频 <ArrowUpRightIcon className="size-3" />
          </Button>
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          放弃编辑
        </Button>
        <Button type="button" disabled={isSubmitDisabled} onClick={() => mutation.mutate(text)}>
          {mutation.isPending ? '发布中...' : '发布微博'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
