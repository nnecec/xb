import { ArrowLeft, X } from 'lucide-react'
import { useMemo } from 'react'

import { Button } from '@/components/ui/button'
import type { StatusDetailPopupPosition } from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'

interface DialogContainerProps {
  open: boolean
  position: StatusDetailPopupPosition
  width?: number
  zIndex?: number
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function DialogContainer({
  open,
  position,
  width,
  zIndex,
  onOpenChange,
  children,
}: DialogContainerProps) {
  if (!open) {
    return null
  }

  const glassOpacity = useAppSettings((s) => s.glassOpacity)
  const glassBlur = useAppSettings((s) => s.glassBlur)

  const glassPanelStyle = useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: `color-mix(in srgb, var(--background) ${glassOpacity}%, transparent)`,
      backdropFilter: `blur(${glassBlur}px)`,
      borderColor: `color-mix(in srgb, var(--border) ${glassOpacity}%, transparent)`,
    }),
    [glassOpacity, glassBlur],
  )

  const glassOverlayStyle = useMemo<React.CSSProperties>(
    () => ({
      backgroundColor: `rgba(0,0,0,${0.5 * (1 - glassOpacity / 100) + 0.15})`,
    }),
    [glassOpacity],
  )

  const isGlassEffect = glassBlur > 0 || glassOpacity < 100

  const panelWidthStyle = useMemo<React.CSSProperties>(() => {
    const w = width ?? 50
    return { width: `${w}%` }
  }, [width])

  const panelClasses = cn(
    'bg-background overflow-y-auto shadow-2xl',
    position === 'left' && 'relative mr-auto h-full rounded-r-2xl',
    position === 'center' &&
      'absolute top-2 left-1/2 h-[calc(100vh-1rem)] max-w-none -translate-x-1/2 rounded-2xl',
    position === 'right' && 'relative ml-auto h-full rounded-l-2xl',
  )

  const headerClasses = cn(
    'bg-background/95 sticky top-0 z-10 flex h-14 items-center justify-between border-b px-4 backdrop-blur',
    position === 'left' && 'rounded-tr-2xl',
    position === 'center' && 'rounded-t-2xl',
    position === 'right' && 'rounded-tl-2xl',
  )

  return (
    <div className="fixed inset-0 flex" style={{ zIndex: zIndex ?? 40 }}>
      <div
        className="absolute inset-0 bg-black/50"
        style={glassOverlayStyle}
        onClick={() => onOpenChange(false)}
      />
      <div
        className={panelClasses}
        style={isGlassEffect ? { ...glassPanelStyle, ...panelWidthStyle } : panelWidthStyle}
      >
        <div className={headerClasses}>
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => onOpenChange(false)}>
            <ArrowLeft className="size-4" />
            返回
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
