import { startTransition, useEffect, useState } from 'react'

import type { TimelinePage } from '@/features/weibo/models/feed'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import type { StatusDetail } from '@/features/weibo/models/status'
import { NavigationRail } from '@/features/weibo/components/navigation-rail'
import { RightRail } from '@/features/weibo/components/right-rail'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'
import {
  loadHomeTimeline,
  loadStatusDetail,
  type HomeTimelineTab,
} from '@/features/weibo/services/weibo-repository'

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
  const [activeTimelineTab, setActiveTimelineTab] = useState<HomeTimelineTab>('for-you')
  const [timelineRequestKey, setTimelineRequestKey] = useState(0)
  const [timelinePage, setTimelinePage] = useState<TimelinePage>({ items: [], nextCursor: null })
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [isTimelineLoading, setIsTimelineLoading] = useState(page.kind === 'home')
  const [statusDetail, setStatusDetail] = useState<StatusDetail | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isStatusLoading, setIsStatusLoading] = useState(page.kind === 'status')

  useEffect(() => {
    if (page.kind !== 'home') {
      return
    }

    setActiveTimelineTab(page.tab)
  }, [page])

  useEffect(() => {
    if (page.kind !== 'home') {
      return
    }

    let cancelled = false
    setIsTimelineLoading(true)
    setTimelineError(null)

    void loadHomeTimeline(activeTimelineTab)
      .then((result) => {
        if (cancelled) {
          return
        }

        startTransition(() => {
          setTimelinePage(result)
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setTimelineError(
          error instanceof Error
            ? error.message
            : 'Unknown Weibo timeline error',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsTimelineLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [activeTimelineTab, page, timelineRequestKey])

  useEffect(() => {
    if (page.kind !== 'status') {
      return
    }

    let cancelled = false
    setIsStatusLoading(true)
    setStatusError(null)

    void loadStatusDetail(page.statusId)
      .then((result) => {
        if (cancelled) {
          return
        }

        startTransition(() => {
          setStatusDetail(result)
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setStatusError(
          error instanceof Error
            ? error.message
            : 'Unknown Weibo detail error',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsStatusLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [page])

  const retryTimeline = () => {
    if (page.kind !== 'home') {
      return
    }

    setTimelineError(null)
    setIsTimelineLoading(true)
    setTimelineRequestKey((current) => current + 1)
  }

  if (page.kind === 'home') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[88px_minmax(0,1fr)_300px] gap-4 px-4 py-4">
          <NavigationRail />
          <HomeTimelinePage
            activeTab={activeTimelineTab}
            errorMessage={timelineError}
            isLoading={isTimelineLoading}
            onRetry={retryTimeline}
            onTabChange={setActiveTimelineTab}
            page={timelinePage}
          />
          <RightRail />
        </div>
      </div>
    )
  }

  if (page.kind === 'status') {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[88px_minmax(0,1fr)_300px] gap-4 px-4 py-4">
          <NavigationRail />
          {isStatusLoading
            ? <PageLoadingState label="Loading this Weibo post..." />
            : null}
          {!isStatusLoading && statusError
            ? <PageErrorState description={statusError} />
            : null}
          {!isStatusLoading && !statusError && statusDetail
            ? <StatusDetailPage detail={statusDetail} />
            : null}
          <RightRail />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[88px_minmax(0,1fr)_300px] gap-4 px-4 py-4">
        <NavigationRail />

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

        <RightRail />
      </div>
    </div>
  )
}
