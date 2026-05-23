import { useMutation } from '@tanstack/react-query'
import { Video } from 'lucide-react'
import { useState } from 'react'
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
  zIndex?: number
  onOpenChange: (open: boolean) => void
}

export function ComposeDialog({ open, zIndex, onOpenChange }: ComposeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" style={{ zIndex }} overlayStyle={{ zIndex }}>
        <ComposeForm onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

function ComposeForm({ onClose }: { onClose: () => void }) {
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
      toast.success('发布成功')
      onClose()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '发布失败，请稍后重试')
    },
  })

  const isSubmitDisabled = mutation.isPending || text.trim().length === 0

  return (
    <DialogContent className="sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>发微博</DialogTitle>
        <DialogDescription>有什么新鲜事想分享给大家？</DialogDescription>
      </DialogHeader>

      <Textarea
        aria-label="微博内容"
        autoFocus
        className="min-h-32"
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="我想..."
      />

      <div className="flex items-center justify-start">
        <EmoticonPicker onSelect={(item) => setText((value) => `${value}${item.phrase}`)} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={openVideoUpload}
          className="ml-2"
        >
          <Video className="size-4" /> 视频
        </Button>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          取消
        </Button>
        <Button type="button" disabled={isSubmitDisabled} onClick={() => mutation.mutate(text)}>
          {mutation.isPending ? '发送中...' : '发布'}
        </Button>
      </DialogFooter>
    </DialogContent>
  )
}
