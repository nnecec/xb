import { getThemePreviewColors, type ThemePreviewColors } from '@/lib/custom-theme'
import { cn } from '@/lib/utils'

function ThemeUiHalfPreview({ colors }: { colors: ThemePreviewColors }) {
  return (
    <div
      className="relative min-w-0 flex-1 overflow-hidden"
      style={{ backgroundColor: colors.background }}
    >
      <div
        className="absolute right-0 bottom-0 left-[18%] rounded-tl-md border-t border-l p-1.5"
        style={{
          backgroundColor: colors.card,
          borderColor: colors.border,
        }}
      >
        <div className="mb-1 flex items-center gap-1">
          <div className="size-2 shrink-0 rounded-full" style={{ backgroundColor: colors.muted }} />
          <div
            className="h-1 w-5 shrink-0 rounded-full"
            style={{ backgroundColor: colors.foreground, opacity: 0.45 }}
          />
        </div>
        <div
          className="mb-1.5 h-0.5 w-full rounded-full"
          style={{ backgroundColor: colors.foreground, opacity: 0.22 }}
        />
        <div className="flex items-center gap-0.5">
          <div className="size-1.5 rounded-full" style={{ backgroundColor: colors.primary }} />
          <div className="size-1.5 rounded-full" style={{ backgroundColor: colors.secondary }} />
          <div className="size-1.5 rounded-full" style={{ backgroundColor: colors.accent }} />
          <div className="size-1.5 rounded-full" style={{ backgroundColor: colors.destructive }} />
        </div>
      </div>
    </div>
  )
}

export function ThemeUiPreview({
  lightCss,
  darkCss,
  className,
  showLabels = false,
}: {
  lightCss: string
  darkCss: string
  className?: string
  showLabels?: boolean
}) {
  const light = getThemePreviewColors(lightCss)
  const dark = getThemePreviewColors(darkCss)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div
        className={cn(
          'border-border/50 aspect-5/3 w-full overflow-hidden rounded-lg border',
          showLabels && 'aspect-5/2.5',
        )}
      >
        <div className="flex h-full">
          <ThemeUiHalfPreview colors={light} />
          <div className="bg-border/60 w-px shrink-0" />
          <ThemeUiHalfPreview colors={dark} />
        </div>
      </div>
      {showLabels && (
        <div className="text-muted-foreground grid grid-cols-2 gap-px text-center text-xs">
          <span>浅色</span>
          <span>深色</span>
        </div>
      )}
    </div>
  )
}
