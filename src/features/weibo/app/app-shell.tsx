import { startTransition, useEffect, useState } from 'react'

import type { TimelinePage } from '@/features/weibo/models/feed'
import type { UserProfile } from '@/features/weibo/models/profile'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import type { StatusDetail } from '@/features/weibo/models/status'
import { NavigationRail } from '@/features/weibo/components/navigation-rail'
import { RightRail } from '@/features/weibo/components/right-rail'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import { ProfilePage } from '@/features/weibo/pages/profile-page'
import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'
import type { RewriteSettings, RewriteTheme } from '@/features/weibo/settings/rewrite-settings'
import {
  loadHomeTimeline,
  loadProfileInfo,
  loadProfilePosts,
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
import { Button } from '@/components/ui/button'

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

function ShellFrame({
  pageKind,
  settings,
  onRewriteEnabledChange,
  onThemeChange,
  children,
}: {
  pageKind: WeiboPageDescriptor['kind']
  settings: RewriteSettings
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: RewriteTheme) => void
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid min-h-screen max-w-7xl grid-cols-[280px_minmax(0,1fr)_300px] gap-4 px-4 py-4">
        <NavigationRail
          pageKind={pageKind}
          settings={settings}
          onRewriteEnabledChange={onRewriteEnabledChange}
          onThemeChange={onThemeChange}
        />
        <div className="min-w-0">
          {children}
        </div>
        <RightRail />
      </div>
    </div>
  )
}

function RewritePausedCard({
  onResume,
}: {
  onResume: () => void
}) {
  return (
    <div className="fixed top-4 right-4 z-[2147483647] w-[min(24rem,calc(100vw-2rem))]">
      <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-lg shadow-black/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">LoveForXb paused</CardTitle>
          <CardDescription>
            The original Weibo page is visible again. Resume the rewrite when you want the X-style layout back.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button onClick={onResume}>
            Resume LoveForXb
          </Button>
          <p className="text-xs text-muted-foreground">
            Theme selection stays persisted and will be applied the next time the rewrite is enabled.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export function AppShell({
  page,
  settings,
  onRewriteEnabledChange,
  onThemeChange,
}: {
  page: WeiboPageDescriptor
  settings: RewriteSettings
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: RewriteTheme) => void
}) {
  const [activeTimelineTab, setActiveTimelineTab] = useState<HomeTimelineTab>('for-you')
  const [timelineRequestKey, setTimelineRequestKey] = useState(0)
  const [timelinePage, setTimelinePage] = useState<TimelinePage>({ items: [], nextCursor: null })
  const [timelineError, setTimelineError] = useState<string | null>(null)
  const [isTimelineLoading, setIsTimelineLoading] = useState(page.kind === 'home')
  const [statusDetail, setStatusDetail] = useState<StatusDetail | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [isStatusLoading, setIsStatusLoading] = useState(page.kind === 'status')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profilePosts, setProfilePosts] = useState<TimelinePage>({ items: [], nextCursor: null })
  const [profileError, setProfileError] = useState<string | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(page.kind === 'profile')

  useEffect(() => {
    if (page.kind !== 'home') {
      return
    }

    setActiveTimelineTab(page.tab)
  }, [page])

  useEffect(() => {
    if (!settings.enabled || page.kind !== 'profile') {
      return
    }

    let cancelled = false
    setIsProfileLoading(true)
    setProfileError(null)

    void Promise.all([
      loadProfileInfo(page.profileId),
      loadProfilePosts(page.profileId),
    ])
      .then(([nextProfile, nextPosts]) => {
        if (cancelled) {
          return
        }

        startTransition(() => {
          setProfile(nextProfile)
          setProfilePosts(nextPosts)
        })
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }

        setProfileError(
          error instanceof Error
            ? error.message
            : 'Unknown Weibo profile error',
        )
      })
      .finally(() => {
        if (!cancelled) {
          setIsProfileLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [page, settings.enabled])

  useEffect(() => {
    if (!settings.enabled || page.kind !== 'home') {
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
  }, [activeTimelineTab, page, settings.enabled, timelineRequestKey])

  useEffect(() => {
    if (!settings.enabled || page.kind !== 'status') {
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
  }, [page, settings.enabled])

  const retryTimeline = () => {
    if (page.kind !== 'home') {
      return
    }

    setTimelineError(null)
    setIsTimelineLoading(true)
    setTimelineRequestKey((current) => current + 1)
  }

  if (!settings.enabled) {
    return <RewritePausedCard onResume={() => onRewriteEnabledChange(true)} />
  }

  if (page.kind === 'home') {
    return (
      <ShellFrame
        pageKind={page.kind}
        settings={settings}
        onRewriteEnabledChange={onRewriteEnabledChange}
        onThemeChange={onThemeChange}
      >
        <HomeTimelinePage
          activeTab={activeTimelineTab}
          errorMessage={timelineError}
          isLoading={isTimelineLoading}
          onRetry={retryTimeline}
          onTabChange={setActiveTimelineTab}
          page={timelinePage}
        />
      </ShellFrame>
    )
  }

  if (page.kind === 'status') {
    return (
      <ShellFrame
        pageKind={page.kind}
        settings={settings}
        onRewriteEnabledChange={onRewriteEnabledChange}
        onThemeChange={onThemeChange}
      >
          {isStatusLoading
            ? <PageLoadingState label="Loading this Weibo post..." />
            : null}
          {!isStatusLoading && statusError
            ? <PageErrorState description={statusError} />
            : null}
          {!isStatusLoading && !statusError && statusDetail
            ? <StatusDetailPage detail={statusDetail} />
            : null}
      </ShellFrame>
    )
  }

  if (page.kind === 'profile') {
    return (
      <ShellFrame
        pageKind={page.kind}
        settings={settings}
        onRewriteEnabledChange={onRewriteEnabledChange}
        onThemeChange={onThemeChange}
      >
          {isProfileLoading
            ? <PageLoadingState label="Loading this profile..." />
            : null}
          {!isProfileLoading && profileError
            ? <PageErrorState description={profileError} />
            : null}
          {!isProfileLoading && !profileError && profile
            ? <ProfilePage activeTab={page.tab} posts={profilePosts} profile={profile} />
            : null}
      </ShellFrame>
    )
  }

  return (
    <ShellFrame
      pageKind={page.kind}
      settings={settings}
      onRewriteEnabledChange={onRewriteEnabledChange}
      onThemeChange={onThemeChange}
    >
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
    </ShellFrame>
  )
}
