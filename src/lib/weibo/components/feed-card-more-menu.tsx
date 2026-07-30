import { Bookmark, Copy, Download, Image, Link, MoreHorizontal, Trash } from 'lucide-react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type FeedToolbarButtonId, FEED_TOOLBAR_BUTTON_IDS } from '@/lib/app-settings'
import { cn } from '@/lib/utils'
import { useGenImageDialog } from '@/lib/weibo/components/gen-image-dialog-context'
import { useFeedCardMediaDownload } from '@/lib/weibo/components/use-feed-card-media-download'
import type { FeedItem } from '@/lib/weibo/models/feed'

type ContentType = 'status' | 'comment'

export interface FeedCardMoreMenuProps {
  type: ContentType
  isOwner: boolean
  item?: FeedItem
  favorited?: boolean
  onFavorite?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
  isDeleting?: boolean
  contentLabel?: string
  visibleActionIds?: FeedToolbarButtonId[]
  onCopyText?: () => void
  className?: string
}

export function FeedCardMoreMenu({
  type,
  isOwner,
  item,
  favorited = false,
  onFavorite,
  onDelete,
  isDeleting,
  contentLabel = '这条内容',
  visibleActionIds = [...FEED_TOOLBAR_BUTTON_IDS],
  onCopyText,
  className,
}: FeedCardMoreMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const { openGenImage } = useGenImageDialog()
  const { downloadDialog, downloadLoading, handleDownload } = useFeedCardMediaDownload(item)

  const showFavorite =
    visibleActionIds.includes('favorite') && type === 'status' && onFavorite !== undefined
  const showGenImage = visibleActionIds.includes('gen-image') && item && type === 'status'
  const showCopyLink = visibleActionIds.includes('copy-link') && type === 'status' && item?.mblogId
  const showCopyText =
    visibleActionIds.includes('copy-text') && type === 'status' && onCopyText !== undefined
  const showDownload =
    visibleActionIds.includes('download-media') &&
    item &&
    type === 'status' &&
    (item.images.length > 0 || item.media !== null || (item.mixMediaInfo?.length ?? 0) > 0)
  const hasVisibleMenuItem =
    showGenImage || showDownload || showFavorite || showCopyLink || showCopyText || isOwner

  if (!hasVisibleMenuItem) {
    return null
  }

  return (
    <>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn('size-8 shrink-0', className)}
            aria-label="更多操作"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
            }}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onCloseAutoFocus={(event) => event.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        >
          {showGenImage ? (
            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false)
                openGenImage(item!)
              }}
            >
              <Image className="mr-2 size-4" />
              生图
            </DropdownMenuItem>
          ) : null}
          {showDownload && (
            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false)
                void handleDownload()
              }}
              disabled={downloadLoading}
            >
              <Download className="mr-2 size-4" />
              批量下载
            </DropdownMenuItem>
          )}
          {showFavorite && (
            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false)
                if (onFavorite) {
                  void (async () => {
                    setFavoriteLoading(true)
                    try {
                      await onFavorite()
                    } finally {
                      setFavoriteLoading(false)
                    }
                  })()
                }
              }}
              disabled={favoriteLoading}
            >
              <Bookmark className="mr-2 size-4" fill={favorited ? 'currentColor' : 'none'} />
              {favorited ? '取消收藏' : '收藏'}
            </DropdownMenuItem>
          )}
          {showCopyLink && (
            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false)
                const url = `https://weibo.com/${item!.author.id}/${item!.mblogId}`
                void navigator.clipboard
                  .writeText(url)
                  .then(() => {
                    toast.success('已复制链接')
                  })
                  .catch(() => {
                    toast.error('复制失败，请稍后再试')
                  })
              }}
            >
              <Link className="mr-2 size-4" />
              复制链接
            </DropdownMenuItem>
          )}
          {showCopyText && (
            <DropdownMenuItem
              onSelect={() => {
                setMenuOpen(false)
                onCopyText?.()
              }}
            >
              <Copy className="mr-2 size-4" />
              复制内容
            </DropdownMenuItem>
          )}
          {isOwner && (
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                setMenuOpen(false)
                setConfirmOpen(true)
              }}
            >
              <Trash className="mr-2 size-4" />
              删除
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除{contentLabel}？</DialogTitle>
            <DialogDescription>删除后无法恢复，微博原站也会同步删除。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              保留{contentLabel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                void (async () => {
                  try {
                    await onDelete?.()
                    setConfirmOpen(false)
                  } catch {
                    // Caller shows toast
                  }
                })()
              }}
            >
              {isDeleting ? '删除中…' : `删除${contentLabel}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {downloadDialog}
    </>
  )
}
