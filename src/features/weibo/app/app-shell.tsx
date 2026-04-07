import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const PAGE_LABELS: Record<WeiboPageDescriptor['kind'], string> = {
  home: 'Home Timeline',
  profile: 'Profile',
  status: 'Status Detail',
  unsupported: 'Unsupported Page',
}

function describePage(page: WeiboPageDescriptor): string {
  switch (page.kind) {
    case 'home':
      return `Active tab: ${page.tab}`
    case 'profile':
      return `Profile ${page.profileId} via /${page.profileSource}`
    case 'status':
      return `Status ${page.statusId} by ${page.authorId}`
    case 'unsupported':
      return `Reason: ${page.reason}`
  }
}

export function AppShell({ page }: { page: WeiboPageDescriptor }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[88px_minmax(0,1fr)_300px] gap-4 px-4 py-4">
        <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Nav</CardTitle>
            <CardDescription>Weibo shell</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div>Home</div>
            <div>Search</div>
            <div>Profile</div>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
          <CardHeader>
            <CardTitle className="text-xl">{PAGE_LABELS[page.kind]}</CardTitle>
            <CardDescription>{describePage(page)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>ShadowRoot shell mounted successfully.</p>
            <p>Route sync is active and listening for main-world history updates.</p>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Right Rail</CardTitle>
            <CardDescription>Placeholder context</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
            <div>Trends</div>
            <div>Profile summary</div>
            <div>Fallback actions</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
