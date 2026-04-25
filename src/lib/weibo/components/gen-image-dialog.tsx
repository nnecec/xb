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
  DialogHeader,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item'
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
      <DialogContent className="gap-0 p-0 sm:max-w-fit">
        <VisuallyHidden>
          <DialogHeader>
            <DialogTitle>生成图片</DialogTitle>
          </DialogHeader>
        </VisuallyHidden>

        <div className="flex p-4">
          {/* Left: Settings */}
          <div className="flex w-[240px] flex-col justify-between gap-4">
            <ItemGroup>
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>数据区域</ItemTitle>
                  <ItemDescription>显示评论、转发、点赞数据</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Switch
                    checked={imageGenShowDataArea}
                    onCheckedChange={(checked) => setImageGenShowDataArea(checked)}
                  />
                </ItemActions>
              </Item>
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>完整图片</ItemTitle>
                  <ItemDescription>可能使图片过长</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Switch
                    checked={imageGenShowFullImages}
                    onCheckedChange={(checked) => setImageGenShowFullImages(checked)}
                  />
                </ItemActions>
              </Item>
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>微博链接</ItemTitle>
                  <ItemDescription>显示微博的原文链接</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Switch
                    checked={imageGenShowWeiboLink}
                    onCheckedChange={(checked) => setImageGenShowWeiboLink(checked)}
                  />
                </ItemActions>
              </Item>
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>深色模式</ItemTitle>
                </ItemContent>
                <ItemActions>
                  <Switch
                    checked={imageGenTheme === 'dark'}
                    onCheckedChange={(checked) => setImageGenTheme(checked ? 'dark' : 'light')}
                  />
                </ItemActions>
              </Item>
            </ItemGroup>

            {/* Action buttons on the left side */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={copyMutation.isPending}
                onClick={() => copyMutation.mutate()}
                className="w-full"
              >
                {copyMutation.isPending ? <Spinner /> : <Copy />}
                复制图片
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={saveMutation.isPending}
                onClick={() => saveMutation.mutate()}
                className="w-full"
              >
                {saveMutation.isPending ? <Spinner /> : <Save />}
                保存图片
              </Button>
              <DialogClose asChild>
                <Button variant="outline" className="col-span-2 w-full">
                  取消
                </Button>
              </DialogClose>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="ml-4 flex-1 border-l pl-4">
            {genImageItem ? (
              <div className="no-scrollbar flex h-[60vh] w-[640px] flex-col overflow-y-auto">
                <GenImageCard ref={cardRef} item={genImageItem} theme={imageGenTheme} />
              </div>
            ) : (
              <div className="flex h-[60vh] w-[640px] items-center justify-center">
                <p className="text-muted-foreground text-sm">暂无数据</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
