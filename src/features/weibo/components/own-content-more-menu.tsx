import { MoreHorizontal, Star } from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
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
import { cn } from '@/lib/utils'

export type ContentType = 'status' | 'comment'

export interface OwnContentMoreMenuProps {
  type: ContentType
  isOwner: boolean
  favorited?: boolean
  onFavorite?: () => void | Promise<void>
  onDelete: () => void | Promise<void>
  isDeleting?: boolean
  contentLabel?: string
  className?: string
}

export function OwnContentMoreMenu({
  type,
  isOwner,
  favorited = false,
  onFavorite,
  onDelete,
  isDeleting,
  contentLabel = '这条内容',
  className,
}: OwnContentMoreMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)

  const showFavorite = type === 'status' && onFavorite !== undefined

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
            onClick={(event) => event.stopPropagation()}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onCloseAutoFocus={(event) => event.preventDefault()}>
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
              <Star className="mr-2 size-4" fill={favorited ? 'currentColor' : 'none'} />
              {favorited ? '取消收藏' : '收藏'}
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
              删除
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            确定要删除{contentLabel}吗？此操作无法撤销。
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={() => {
                void (async () => {
                  try {
                    await onDelete()
                    setConfirmOpen(false)
                  } catch {
                    // Caller shows toast
                  }
                })()
              }}
            >
              {isDeleting ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
