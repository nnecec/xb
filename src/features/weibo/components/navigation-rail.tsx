import { Compass, House, MoonStar, Search, Sun, SunMoon, UserRound } from 'lucide-react'

import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import type { AppTheme } from '@/lib/app-settings'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

const NAV_ITEMS = [
  { icon: House, label: 'Home', pageKinds: ['home'] },
  { icon: Search, label: 'Explore', pageKinds: ['unsupported'] },
  { icon: Compass, label: 'Following', pageKinds: ['status'] },
  { icon: UserRound, label: 'Profile', pageKinds: ['profile'] },
] as const

const THEME_ITEMS: Array<{
  icon: typeof SunMoon
  label: string
  value: AppTheme
}> = [
  { icon: SunMoon, label: 'System', value: 'system' },
  { icon: Sun, label: 'Light', value: 'light' },
  { icon: MoonStar, label: 'Dark', value: 'dark' },
]

export function NavigationRail({
  pageKind,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
}: {
  pageKind: WeiboPageDescriptor['kind']
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
}) {
  return (
    <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">LoveForXb</CardTitle>
        <CardDescription>Weibo, rebuilt for reading</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-4 pb-4">
        <div className="flex flex-col gap-2">
          {NAV_ITEMS.map(({ icon: Icon, label, pageKinds }) => {
            const isActive = pageKinds.some((candidate) => candidate === pageKind)

            return (
            <div
              key={label}
              className={[
                'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors',
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              ].join(' ')}
            >
              <Icon aria-hidden="true" />
              <span>{label}</span>
            </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3">
          <div
            className="flex items-center justify-between gap-3"
          >
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">Rewrite Weibo</p>
              <p className="text-xs text-muted-foreground">
                Toggle back to the original page without leaving the tab.
              </p>
            </div>
            <Switch
              checked={rewriteEnabled}
              aria-label="Toggle LoveForXb rewrite"
              onCheckedChange={onRewriteEnabledChange}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Theme
            </p>
            <ToggleGroup
              type="single"
              value={theme}
              variant="outline"
              className="grid w-full grid-cols-3"
              onValueChange={(value) => {
                if (value) {
                  onThemeChange(value as AppTheme)
                }
              }}
            >
              {THEME_ITEMS.map(({ icon: Icon, label, value }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="flex min-w-0 flex-col gap-1 px-2 py-2 text-[11px]"
                >
                  <Icon className="size-3.5" />
                  <span>{label}</span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
