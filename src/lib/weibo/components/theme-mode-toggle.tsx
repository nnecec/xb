import { CheckIcon, MoonStar, Sun, SunMoon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

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

const iconMotion = {
  initial: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 0.25, filter: 'blur(4px)' },
  transition: { type: 'spring' as const, duration: 0.3, bounce: 0 },
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
          <span className="relative flex size-4 items-center justify-center">
            <AnimatePresence initial={false} mode="popLayout">
              <motion.span
                key={value}
                className="absolute inset-0 flex items-center justify-center"
                initial={iconMotion.initial}
                animate={iconMotion.animate}
                exit={iconMotion.exit}
                transition={iconMotion.transition}
              >
                <current.Icon className="size-4" />
              </motion.span>
            </AnimatePresence>
          </span>
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
              {isActive ? <CheckIcon className="size-3" /> : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
