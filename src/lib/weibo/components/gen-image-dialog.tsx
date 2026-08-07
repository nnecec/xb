import { useMutation } from '@tanstack/react-query'
import { toBlob } from 'html-to-image'
import { Copy, Save } from 'lucide-react'
import { useRef } from 'react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { useGenImageDialog } from '@/lib/weibo/components/gen-image-dialog-context'
import {
  CardBold,
  CardComic,
  CardContrast,
  CardDefault,
  CardGlass,
  CardMinimal,
  CardSoft,
  CardSticker,
  CardVogue,
  type CardStyle,
} from '@/lib/weibo/components/gen-image/card-index'
import { transformFeedItem } from '@/lib/weibo/components/gen-image/utils'

/** Valid data URL when a remote image fetch fails; empty string breaks `img` load in Firefox. */
const CAPTURE_FAILED_IMAGE_PLACEHOLDER =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='

/**
 * Sina 图床会校验 Referer；无 Referer 时 `fetch` 常返回 HTML 错误页但仍为 200，
 * 被当成 JPEG 转成 data URL 后触发 `img` `error`（第一次失败），并污染 html-to-image 的全局缓存。
 */
const WEIBO_CAPTURE_FETCH_INIT: RequestInit = {
  referrer: 'https://weibo.com/',
  referrerPolicy: 'unsafe-url',
}

async function waitForCardImages(root: HTMLElement): Promise<void> {
  const imgs = [...root.querySelectorAll('img')]
  await Promise.all(
    imgs.map(async (img) => {
      if (!img.src || img.src.startsWith('data:')) return
      try {
        await img.decode()
      } catch {
        // 展示图加载失败时仍继续；嵌入阶段会用带 Referer 的 fetch 重拉
      }
    }),
  )
}

const CARD_STYLE_OPTIONS: { value: CardStyle; label: string }[] = [
  { value: 'default', label: '默认' },
  { value: 'minimal', label: '现代' },
  { value: 'glass', label: '玻璃' },
  { value: 'bold', label: '色彩' },
  { value: 'contrast', label: '邮票' },
  { value: 'vogue', label: '杂志' },
  { value: 'soft', label: '柔和' },
  { value: 'sticker', label: '贴纸' },
  { value: 'comic', label: '漫画' },
]

const CARD_COMPONENTS: Record<
  CardStyle,
  React.ComponentType<{
    data: ReturnType<typeof transformFeedItem>
    theme?: 'light' | 'dark'
    showStats?: boolean
    showLink?: boolean
    showFullImages?: boolean
  }>
> = {
  default: CardDefault,
  minimal: CardMinimal,
  glass: CardGlass,
  bold: CardBold,
  contrast: CardContrast,
  vogue: CardVogue,
  soft: CardSoft,
  sticker: CardSticker,
  comic: CardComic,
}

async function captureCardAsBlob(
  cardRef: React.RefObject<HTMLDivElement | null>,
): Promise<Blob | null> {
  if (!cardRef.current) return null

  await waitForCardImages(cardRef.current)

  const blob = await toBlob(cardRef.current, {
    pixelRatio: 2,
    cacheBust: true,
    fontEmbedCSS: '',
    imagePlaceholder: CAPTURE_FAILED_IMAGE_PLACEHOLDER,
    fetchRequestInit: WEIBO_CAPTURE_FETCH_INIT,
    filter: (node) => {
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

export function getGenImageThemeStyle(theme: 'light' | 'dark'): React.CSSProperties {
  if (theme === 'dark') {
    return {
      '--background': 'oklch(0.145 0 0)',
      '--foreground': 'oklch(0.985 0 0)',
      '--card': 'oklch(0.145 0 0)',
      '--card-foreground': 'oklch(0.985 0 0)',
      '--muted': 'oklch(0.269 0 0)',
      '--muted-foreground': 'oklch(0.708 0 0)',
      '--primary': 'oklch(0.922 0 0)',
      '--primary-foreground': 'oklch(0.205 0 0)',
    } as React.CSSProperties
  }

  return {
    '--background': 'oklch(1 0 0)',
    '--foreground': 'oklch(0.145 0 0)',
    '--card': 'oklch(1 0 0)',
    '--card-foreground': 'oklch(0.145 0 0)',
    '--muted': 'oklch(0.97 0 0)',
    '--muted-foreground': 'oklch(0.556 0 0)',
    '--primary': 'oklch(0.205 0 0)',
    '--primary-foreground': 'oklch(0.985 0 0)',
  } as React.CSSProperties
}

export function GenImageDialog() {
  const { resolvedItem, isLoadingLongText, closeGenImage } = useGenImageDialog()
  const cardRef = useRef<HTMLDivElement>(null)

  const {
    imageGenTheme,
    imageGenShowDataArea,
    imageGenShowFullImages,
    imageGenShowWeiboLink,
    imageGenCardStyle,
    updateSettings,
  } = useAppSettings(
    useShallow((s) => ({
      imageGenTheme: s.imageGenTheme,
      imageGenShowDataArea: s.imageGenShowDataArea,
      imageGenShowFullImages: s.imageGenShowFullImages,
      imageGenShowWeiboLink: s.imageGenShowWeiboLink,
      imageGenCardStyle: s.imageGenCardStyle,
      updateSettings: s.updateSettings,
    })),
  )

  const copyMutation = useMutation({
    mutationFn: async () => {
      const blob = await captureCardAsBlob(cardRef)
      if (!blob) throw new Error('Failed to capture card')
      await copyBlobToClipboard(blob)
    },
    onSuccess: () => {
      toast.success('已复制到剪贴板')
    },
    onError: () => {
      toast.error('复制图片失败，请重试')
    },
  })

  const saveMutation = useMutation({
    mutationFn: async () => {
      const blob = await captureCardAsBlob(cardRef)
      if (!blob) throw new Error('Failed to capture card')
      downloadBlob(blob, `${resolvedItem?.author.name}_${resolvedItem?.text?.slice(0, 10)}`)
    },
    onSuccess: () => {
      toast.success('图片已开始下载')
    },
    onError: () => {
      toast.error('保存图片失败，请重试')
    },
  })

  const cardData = resolvedItem ? transformFeedItem(resolvedItem) : null
  const CardComponent = cardData ? CARD_COMPONENTS[imageGenCardStyle] : null

  const sharedStyle = getGenImageThemeStyle(imageGenTheme)

  return (
    <Dialog open={resolvedItem !== null} onOpenChange={closeGenImage}>
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
                  <ItemTitle>卡片风格</ItemTitle>
                  <ItemDescription>
                    <Select
                      value={imageGenCardStyle}
                      onValueChange={(value) =>
                        void updateSettings({ imageGenCardStyle: value as CardStyle })
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CARD_STYLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </ItemDescription>
                </ItemContent>
              </Item>
              <Item size="sm">
                <ItemContent>
                  <ItemTitle>数据区域</ItemTitle>
                  <ItemDescription>显示评论、转发、点赞数据</ItemDescription>
                </ItemContent>
                <ItemActions>
                  <Switch
                    checked={imageGenShowDataArea}
                    onCheckedChange={(checked) =>
                      void updateSettings({ imageGenShowDataArea: checked })
                    }
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
                    onCheckedChange={(checked) =>
                      void updateSettings({ imageGenShowFullImages: checked })
                    }
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
                    onCheckedChange={(checked) =>
                      void updateSettings({ imageGenShowWeiboLink: checked })
                    }
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
                    onCheckedChange={(checked) =>
                      void updateSettings({ imageGenTheme: checked ? 'dark' : 'light' })
                    }
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
            {isLoadingLongText ? (
              <div className="flex h-[60vh] w-[640px] items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <Spinner />
                  <p className="text-muted-foreground text-sm">加载完整内容中...</p>
                </div>
              </div>
            ) : cardData && CardComponent ? (
              <div className="no-scrollbar flex h-[60vh] w-[640px] flex-col overflow-y-auto">
                <div ref={cardRef} className="xb-generated-image" style={sharedStyle}>
                  <CardComponent
                    data={cardData}
                    theme={imageGenTheme}
                    showStats={imageGenShowDataArea}
                    showLink={imageGenShowWeiboLink}
                    showFullImages={imageGenShowFullImages}
                  />
                </div>
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
