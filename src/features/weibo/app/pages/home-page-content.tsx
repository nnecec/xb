import { useMemo } from 'react'
import { useLocation } from 'react-router'

import { useAppShellContext } from '@/features/weibo/app/app-shell-layout'
import { useHomeTimelineData } from '@/features/weibo/app/app-shell-queries'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'
import type { HomeTimelineTab } from '@/features/weibo/services/weibo-repository'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import { useAppSettings } from '@/lib/app-settings-store'

interface HomePageContentProps {
  tab?: HomeTimelineTab
}

export function HomePageContent({ tab = 'for-you' }: HomePageContentProps) {
  const ctx = useAppShellContext()
  const location = useLocation()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const page = useMemo(
    () =>
      parseWeiboUrl(
        new URL(`${location.pathname}${location.search}`, window.location.origin).href,
      ),
    [location.pathname, location.search],
  )

  const activeTimelineTab = tab ?? 'for-you'
  const isEnabled = rewriteEnabled && page.kind === 'home'

  const { timelineQuery, items: timelineItems } = useHomeTimelineData({
    activeTimelineTab: activeTimelineTab,
    isEnabled,
  })

  return (
    <div className="relative h-full mx-auto">
      <HomeTimelinePage
        activeTab={activeTimelineTab}
        errorMessage={
          timelineQuery.error instanceof Error ? timelineQuery.error.message : null
        }
        hasNextPage={Boolean(timelineQuery.hasNextPage)}
        isFetchingNextPage={timelineQuery.isFetchingNextPage}
        isLoading={timelineQuery.isLoading}
        items={timelineItems}
        onNavigate={ctx.navigateToStatusDetail}
        onRetry={() => void timelineQuery.refetch()}
        onLoadNextPage={() => void timelineQuery.fetchNextPage()}
        onCommentClick={(item) =>
          ctx.setComposeTarget({
            kind: 'status',
            mode: 'comment',
            statusId: item.id,
            targetCommentId: null,
            authorName: item.author.name,
            excerpt: item.text.trim().slice(0, 80),
          })
        }
        onRepostClick={(item) =>
          ctx.setComposeTarget({
            kind: 'status',
            mode: 'repost',
            statusId: item.id,
            targetCommentId: null,
            authorName: item.author.name,
            excerpt: item.text.trim().slice(0, 80),
          })
        }
        onTabChange={ctx.onHomeTabChange}
      />
    </div>
  )
}
