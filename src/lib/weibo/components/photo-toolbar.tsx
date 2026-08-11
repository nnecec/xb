import { Repeat, RotateCcw, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import type { OverlayRenderProps } from 'react-photo-view/dist/types'

import { Button } from '@/components/ui/button'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'

interface PhotoToolbarProps {
  overlayProps: OverlayRenderProps
}

const ZOOM_STEP = 0.5
const MIN_ZOOM = 0.5
const MAX_ZOOM = 3

export function PhotoToolbar({ overlayProps }: PhotoToolbarProps) {
  const { scale, onScale, rotate, onRotate } = overlayProps

  const photoLoopEnabled = useAppSettings((s) => s.photoLoopEnabled)
  const updateSettings = useAppSettings((s) => s.updateSettings)

  const handleZoomIn = () => {
    const newScale = Math.min(scale + ZOOM_STEP, MAX_ZOOM)
    onScale(newScale)
  }

  const handleZoomOut = () => {
    const newScale = Math.max(scale - ZOOM_STEP, MIN_ZOOM)
    onScale(newScale)
  }

  const handleRotateCcw = () => {
    onRotate(rotate - 90)
  }

  const handleRotateCw = () => {
    onRotate(rotate + 90)
  }

  const handleToggleLoop = () => {
    updateSettings({ photoLoopEnabled: !photoLoopEnabled })
  }

  const canZoomIn = scale < MAX_ZOOM
  const canZoomOut = scale > MIN_ZOOM

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleToggleLoop}
        aria-label={photoLoopEnabled ? '关闭循环播放' : '开启循环播放'}
        className={cn(!photoLoopEnabled && 'opacity-50')}
      >
        <Repeat className="size-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleRotateCcw}
        aria-label="逆时针旋转"
      >
        <RotateCcw className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleRotateCw}
        aria-label="顺时针旋转"
      >
        <RotateCw className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleZoomOut}
        disabled={!canZoomOut}
        aria-label="缩小"
      >
        <ZoomOut className="size-4" />
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleZoomIn}
        disabled={!canZoomIn}
        aria-label="放大"
      >
        <ZoomIn className="size-4" />
      </Button>
    </div>
  )
}
