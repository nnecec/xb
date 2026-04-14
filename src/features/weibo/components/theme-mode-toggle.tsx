import { MoonStar, Sun, SunMoon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { AppTheme } from '@/lib/app-settings'

const THEME_META: Record<AppTheme, { label: string; Icon: typeof SunMoon }> = {
  system: { label: '跟随系统', Icon: SunMoon },
  light: { label: '浅色', Icon: Sun },
  dark: { label: '深色', Icon: MoonStar },
}

export function ThemeModeToggle({
  value,
  onChange,
}: {
  value: AppTheme
  onChange: (theme: AppTheme) => void
}) {
  const current = THEME_META[value]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="secondary"
          aria-label={`主题模式：${current.label}`}
          title={`主题模式：${current.label}`}
        >
          <current.Icon className="size-4" />
          <span className="sr-only">当前主题: {current.label}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent side="top" align="start" className="w-36">
        {(['system', 'light', 'dark'] as const).map((theme) => {
          const { Icon, label } = THEME_META[theme]
          const isActive = value === theme

          return (
            <DropdownMenuItem key={theme} onClick={() => onChange(theme)}>
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {isActive ? <span className="text-muted-foreground text-xs">当前</span> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
