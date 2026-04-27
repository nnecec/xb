import { Sparkles, Zap } from 'lucide-react'
import type { ReactNode } from 'react'
import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useOutletContext } from 'react-router'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { AppTheme } from '@/lib/app-settings'
import type { AppShellContext } from '@/lib/weibo/app/app-shell'
import { BackToTop } from '@/lib/weibo/components/back-to-top'
import { NavigationRail } from '@/lib/weibo/components/navigation-rail'
import { RightRail } from '@/lib/weibo/components/right-rail'
import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'
import { parseWeiboUrl } from '@/lib/weibo/route/parse-weibo-url'

const PAGE_LABELS: Record<WeiboPageDescriptor['kind'], string> = {
  home: '主页',
  profile: '个人主页',
  favorites: '收藏',
  status: '微博详情',
  notifications: '通知',
  unsupported: '不支持的页面',
}

function describePage(page: WeiboPageDescriptor): string {
  switch (page.kind) {
    case 'home':
      return `当前标签: ${page.tab}`
    case 'profile':
      return `用户 ${page.profileId} via /${page.profileSource}`
    case 'favorites':
      return `用户 ${page.uid} 的收藏`
    case 'status':
      return `微博 ${page.statusId} by ${page.authorId}`
    case 'notifications':
      return `通知 - ${page.tab}`
    case 'unsupported':
      return `原因: ${page.reason}`
  }
}

/** Routes whose primary feed scrolls inside ShellFrame `<main>` (timeline + profile posts). */
function mainScrollRestorationKey(pathname: string, search: string): string | null {
  const page = parseWeiboUrl(new URL(`${pathname}${search}`, window.location.origin).href)
  if (
    page.kind === 'home' ||
    page.kind === 'profile' ||
    page.kind === 'favorites' ||
    page.kind === 'notifications'
  ) {
    return `${pathname}${search}`
  }
  return null
}

interface ShellFrameProps {
  pageKind: WeiboPageDescriptor['kind']
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  onRefresh?: () => void
  onSettingsOpen: () => void
  mainRef: React.RefObject<HTMLDivElement | null>
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
  onRefresh,
  onSettingsOpen,
  mainRef,
  children,
}: ShellFrameProps) {
  const location = useLocation()
  const savedMainScrollByRouteRef = useRef<Partial<Record<string, number>>>({})
  const locationRef = useRef(location)
  locationRef.current = location

  useEffect(() => {
    const main = mainRef.current
    if (!main) {
      return
    }
    const onScroll = () => {
      const { pathname, search } = locationRef.current
      const key = mainScrollRestorationKey(pathname, search)
      if (key) {
        savedMainScrollByRouteRef.current[key] = main.scrollTop
      }
    }
    main.addEventListener('scroll', onScroll, { passive: true })
    return () => main.removeEventListener('scroll', onScroll)
  }, [mainRef])

  useLayoutEffect(() => {
    const main = mainRef.current
    const key = mainScrollRestorationKey(location.pathname, location.search)
    if (!main || !key) {
      return
    }
    const y = savedMainScrollByRouteRef.current[key] ?? 0
    main.scrollTop = y
  }, [location.pathname, location.search, mainRef])

  return (
    <div className="bg-background text-foreground flex h-screen flex-col overflow-hidden">
      <div className="relative mx-auto flex h-full w-full gap-3 px-3 md:gap-4 md:px-4 lg:max-w-[1000px] xl:max-w-[1200px]">
        <div className="flex h-full shrink-0 flex-col">
          <NavigationRail
            pageKind={pageKind}
            viewingProfileUserId={viewingProfileUserId}
            rewriteEnabled={rewriteEnabled}
            theme={theme}
            onRewriteEnabledChange={onRewriteEnabledChange}
            onThemeChange={onThemeChange}
            onRefresh={onRefresh}
            onSettingsOpen={onSettingsOpen}
          />
        </div>
        <main className="no-scrollbar min-w-0 flex-1 overflow-y-auto py-4" ref={mainRef}>
          {children}
        </main>
        <div className="hidden shrink-0 pt-4 md:flex md:w-[200px] xl:w-[240px]">
          <RightRail />
        </div>
        <BackToTop containerRef={mainRef} />
      </div>
    </div>
  )
}

export function RewritePausedCard({ onResume }: { onResume: () => void }) {
  return (
    <div className="fixed bottom-4 left-4 z-2147483647">
      <Card className="bg-card/95 w-40 shadow-lg shadow-black/5 backdrop-blur md:w-60 lg:w-60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="text-primary h-4 w-4" />
            xb
          </CardTitle>
          <CardDescription>一键切换「更清爽、更 X 的」超级体验</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={onResume} className="justify-between">
            <span>Let's xb!</span>
            <Zap className="h-4 w-4" />
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
      <CardContent className="text-muted-foreground flex flex-col gap-3 text-sm">
        <p>ShadowRoot 已成功挂载。</p>
        <p>路由同步已激活，正在监听主世界历史更新。</p>
      </CardContent>
    </Card>
  )
}
