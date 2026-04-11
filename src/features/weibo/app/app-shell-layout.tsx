import { ArrowRight, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { useOutletContext } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AppShellContext } from '@/features/weibo/app/app-shell'
import { BackToTop } from '@/features/weibo/components/back-to-top'
import { NavigationRail } from '@/features/weibo/components/navigation-rail'
import { RightRail } from '@/features/weibo/components/right-rail'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import type { AppTheme } from '@/lib/app-settings'

const PAGE_LABELS: Record<WeiboPageDescriptor['kind'], string> = {
  home: '主页',
  profile: '个人主页',
  status: '微博详情',
  unsupported: '不支持的页面',
}

function describePage(page: WeiboPageDescriptor): string {
  switch (page.kind) {
    case 'home':
      return `当前标签: ${page.tab}`
    case 'profile':
      return `用户 ${page.profileId} via /${page.profileSource}`
    case 'status':
      return `微博 ${page.statusId} by ${page.authorId}`
    case 'unsupported':
      return `原因: ${page.reason}`
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

export function useAppShellContext() {
  return useOutletContext<AppShellContext>()
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
  const mainRef = useRef<HTMLDivElement>(null)

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="relative mx-auto flex h-full w-full gap-3 px-3 md:gap-4 md:px-4 lg:max-w-[1000px] xl:max-w-[1200px]">
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
        <main className="min-w-0 flex-1 overflow-y-auto pt-4" ref={mainRef}>
          {children}
        </main>
        <div className="hidden md:flex md:w-[200px] xl:w-[240px] shrink-0 pt-4">
          <RightRail />
        </div>
        <BackToTop container={mainRef.current} />
      </div>
    </div>
  )
}

export function RewritePausedCard({ onResume }: { onResume: () => void }) {
  return (
    <div className="fixed bottom-4 left-4 z-2147483647">
      <Card className="bg-card/95 shadow-lg shadow-black/5 backdrop-blur w-40 md:w-60 lg:w-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            xb
          </CardTitle>
          <CardDescription>一键切换「更清爽、更 X 的」超级体验</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={onResume} className="justify-between">
            <span>开始 xb</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function UnsupportedPageCard({ page }: { page: WeiboPageDescriptor }) {
  return (
    <Card className="border-border/70 bg-card/95 shadow-none">
      <CardHeader>
        <CardTitle className="text-xl">{PAGE_LABELS[page.kind]}</CardTitle>
        <CardDescription>{describePage(page)}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
        <p>ShadowRoot 已成功挂载。</p>
        <p>路由同步已激活，正在监听主世界历史更新。</p>
      </CardContent>
    </Card>
  )
}
