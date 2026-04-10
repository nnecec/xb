import { ArrowRight, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { NavigationRail } from '@/features/weibo/components/navigation-rail'
import { RightRail } from '@/features/weibo/components/right-rail'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import type { AppTheme } from '@/lib/app-settings'

const PAGE_LABELS: Record<WeiboPageDescriptor['kind'], string> = {
  home: 'Home',
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

interface ShellFrameProps {
  pageKind: WeiboPageDescriptor['kind']
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  children: ReactNode
}

export function ShellFrame({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
  children,
}: ShellFrameProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="mx-auto flex h-full w-full gap-3 px-3 py-3 md:gap-4 md:px-4 md:py-4 xl:max-w-[1200px]">
        <div className="flex h-full shrink-0 flex-col">
          <NavigationRail
            pageKind={pageKind}
            viewingProfileUserId={viewingProfileUserId}
            rewriteEnabled={rewriteEnabled}
            theme={theme}
            onRewriteEnabledChange={onRewriteEnabledChange}
            onThemeChange={onThemeChange}
          />
        </div>
        <main className="min-w-0 flex-1 overflow-hidden pb-10">{children}</main>
        <div className="hidden md:flex md:w-[240px] xl:w-[280px] shrink-0">
          <RightRail />
        </div>
      </div>
    </div>
  )
}

export function RewritePausedCard({ onResume }: { onResume: () => void }) {
  return (
    <div className="fixed bottom-4 left-4 z-2147483647">
      <Card className="rounded-[28px] bg-card/95 shadow-lg shadow-black/5 backdrop-blur w-40 md:w-60 lg:w-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            xb
          </CardTitle>
          <CardDescription>一键切换「更清爽、更 X 的」超级体验</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={onResume} className="justify-between">
            <span>Let's xb</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function UnsupportedPageCard({ page }: { page: WeiboPageDescriptor }) {
  return (
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
  )
}
