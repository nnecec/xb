import { useMutation } from '@tanstack/react-query'
import { toBlob } from 'html-to-image'
import { Copy, Save } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useAppSettings } from '@/lib/app-settings-store'
import { GenImageCard, type GenImageCardTheme } from '@/lib/weibo/components/gen-image-card'
import { useGenImageDialog } from '@/lib/weibo/components/gen-image-dialog-context'

async function captureCardAsBlob(
  cardRef: React.RefObject<HTMLDivElement | null>,
): Promise<Blob | null> {
  if (!cardRef.current) return null

  const blob = await toBlob(cardRef.current, {
    pixelRatio: 2,
    cacheBust: true,
    // Skip embedding web fonts to avoid CORS errors from external stylesheets
    fontEmbedCSS: '',
    // Filter out external stylesheets that can't be read due to CORS
    filter: (node) => {
      // Exclude link elements that load external CSS
      if (node.nodeName === 'LINK' && node.getAttribute('rel') === 'stylesheet') {
        return false
      }
      return true
    },
  })
  return blob
}

async function copyBlobToClipboard(blob: Blob): Promise<void> {
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })])
}

function downloadBlob(blob: Blob, title: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `xb_${title}.png`
  a.click()
  URL.revokeObjectURL(url)
}

export function GenImageDialog() {
  const { genImageItem, closeGenImage } = useGenImageDialog()
  const cardRef = useRef<HTMLDivElement>(null)
  const [imageGenTheme, setImageGenTheme] = useState<GenImageCardTheme>('light')

  const imageGenShowDataArea = useAppSettings((s) => s.imageGenShowDataArea)
  const imageGenShowFullImages = useAppSettings((s) => s.imageGenShowFullImages)
  const imageGenShowWeiboLink = useAppSettings((s) => s.imageGenShowWeiboLink)
  const setImageGenShowDataArea = useAppSettings((s) => s.setImageGenShowDataArea)
  const setImageGenShowFullImages = useAppSettings((s) => s.setImageGenShowFullImages)
  const setImageGenShowWeiboLink = useAppSettings((s) => s.setImageGenShowWeiboLink)

  const copyMutation = useMutation({
    mutationFn: async () => {
      const blob = await captureCardAsBlob(cardRef)
      if (!blob) throw new Error('Failed to capture card')
      await copyBlobToClipboard(blob)
    },
    onSuccess: () => {
      toast.success('已复制到剪贴板')
    },
    onError: (error) => {
      console.error('[GenImageCard] Copy failed:', error)
      toast.error('复制图片失败，请重试')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const blob = await captureCardAsBlob(cardRef)
      if (!blob) throw new Error('Failed to capture card')
      downloadBlob(blob, `${genImageItem?.author.name}_${genImageItem?.text?.slice(0, 10)}`)
    },
    onSuccess: () => {
      toast.success('图片已开始下载')
    },
    onError: (error) => {
      console.error('[GenImageCard] Save failed:', error)
      toast.error('保存图片失败，请重试')
    },
  })

  return (
    <Dialog open={genImageItem !== null} onOpenChange={closeGenImage}>
      <DialogContent className="max-w-[640px]">
        <DialogHeader>
          <DialogTitle>生成图片</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label>显示数据区域</Label>
              <p className="text-muted-foreground text-xs">
                在图片卡片底部显示评论、转发、点赞数据
              </p>
            </div>
            <Switch
              checked={imageGenShowDataArea}
              onCheckedChange={(checked) => setImageGenShowDataArea(checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label>展示完整图片</Label>
              <p className="text-muted-foreground text-xs">展示完整的图片，可能使图片过长</p>
            </div>
            <Switch
              checked={imageGenShowFullImages}
              onCheckedChange={(checked) => setImageGenShowFullImages(checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label>显示微博链接</Label>
              <p className="text-muted-foreground text-xs">在图片卡片底部显示微博的原文链接</p>
            </div>
            <Switch
              checked={imageGenShowWeiboLink}
              onCheckedChange={(checked) => setImageGenShowWeiboLink(checked)}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Label>深色模式</Label>
              <p className="text-muted-foreground text-xs">将图片卡片切换为深色主题</p>
            </div>
            <Switch
              checked={imageGenTheme === 'dark'}
              onCheckedChange={(checked) => setImageGenTheme(checked ? 'dark' : 'light')}
            />
          </div>
        </div>

        {genImageItem ? (
          <div className="no-scrollbar -mx-4 max-h-[50vh] overflow-y-auto px-4">
            <GenImageCard ref={cardRef} item={genImageItem} theme={imageGenTheme} />
          </div>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-sm">暂无数据</p>
          </div>
        )}
        <DialogFooter>
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="outline">取消</Button>
            </DialogClose>
            <Button
              type="button"
              variant="outline"
              disabled={copyMutation.isPending}
              onClick={() => copyMutation.mutate()}
            >
              {copyMutation.isPending ? <Spinner /> : <Copy />}
              复制图片
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              {saveMutation.isPending ? <Spinner /> : <Save />}
              保存图片
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
