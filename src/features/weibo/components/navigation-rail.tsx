import { Compass, House, Search, UserRound } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const NAV_ITEMS = [
  { icon: House, label: 'Home' },
  { icon: Search, label: 'Explore' },
  { icon: Compass, label: 'Following' },
  { icon: UserRound, label: 'Profile' },
]

export function NavigationRail() {
  return (
    <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
      <CardHeader>
        <CardTitle className="text-base">LoveForXb</CardTitle>
        <CardDescription>Weibo, rebuilt for reading</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-4 pb-4">
        {NAV_ITEMS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
