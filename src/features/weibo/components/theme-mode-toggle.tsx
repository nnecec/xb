import { useMemo, useState } from 'react'
import { MoonStar, Sun, SunMoon } from 'lucide-react'

import type { AppTheme } from '@/lib/app-settings'
import { Button } from '@/components/ui/button'

const THEME_META: Record<AppTheme, { label: string, Icon: typeof SunMoon }> = {
  system: { label: 'System', Icon: SunMoon },
  light: { label: 'Light', Icon: Sun },
  dark: { label: 'Dark', Icon: MoonStar },
}

export function ThemeModeToggle({
  value,
  onChange,
}: {
  value: AppTheme
  onChange: (theme: AppTheme) => void
}) {
  const [open, setOpen] = useState(false)
  const current = useMemo(() => THEME_META[value], [value])

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        className="w-full justify-start gap-2"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
      >
        <current.Icon className="size-4" />
        {current.label}
      </Button>

      {open ? (
        <div className="absolute z-50 mt-2 w-full overflow-hidden rounded-md border border-border bg-popover p-1 shadow-md">
          {(['system', 'light', 'dark'] as const).map((theme) => {
            const { Icon, label } = THEME_META[theme]
            const isActive = value === theme
            return (
              <button
                key={theme}
                type="button"
                className={[
                  'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm',
                  isActive ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60',
                ].join(' ')}
                onClick={() => {
                  onChange(theme)
                  setOpen(false)
                }}
              >
                <Icon className="size-4" />
                {label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
