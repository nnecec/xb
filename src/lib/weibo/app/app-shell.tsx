import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

import type { HomeTab } from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { RewritePausedCard, ShellFrame } from '@/lib/weibo/app/app-shell-layout'
import { AuthRequiredDialog } from '@/lib/weibo/components/auth-required-dialog'
import { CommentModal } from '@/lib/weibo/components/comment-modal'
import { ComposeDialog } from '@/lib/weibo/components/compose-dialog'
import { GenImageDialogProvider } from '@/lib/weibo/components/gen-image-dialog-context'
import { SettingsDialog } from '@/lib/weibo/components/settings-dialog'
import { type StatusCardHost, StatusCardHostProvider } from '@/lib/weibo/components/status-card'
import { followGroupsQueryOptions } from '@/lib/weibo/data/weibo-data'
import { composeTargetFromFeedItem, type ComposeTarget } from '@/lib/weibo/models/compose'
import { getDefaultFollowGroupForHomeTab } from '@/lib/weibo/models/explore-utils'
import type { StatusDetailNavigationItem } from '@/lib/weibo/models/feed'
import { homeTimelinePathFromTab } from '@/lib/weibo/route/home-timeline-path'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'
import { onUnauthorized } from '@/lib/weibo/services/auth-events'

const GenImageDialog = lazy(() =>
  import('@/lib/weibo/components/gen-image-dialog').then((m) => ({ default: m.GenImageDialog })),
)

export interface AppShellContext {
  page: ReturnType<typeof useWeiboPage>
  navigateToStatusDetail: (item: StatusDetailNavigationItem) => void
  resetMainScroll: () => void
  scrollMainToTop: () => void
  composeTarget: ComposeTarget | null
  setComposeTarget: (target: ComposeTarget | null) => void
  viewingProfileUserId: string | null
  onProfileUserIdChange: (userId: string | null) => void
  onHomeTabChange: (tab: HomeTab) => void
  refreshTimeline: () => void
  onFollowGroupChange: (gid: string | null) => void
}

export function AppShell() {
  const navigate = useNavigate()
  const page = useWeiboPage()
  const queryClient = useQueryClient()

  const { theme, rewriteEnabled, contentWidth, customContentWidth, updateSettings } =
    useAppSettings(
      useShallow((state) => ({
        theme: state.theme,
        rewriteEnabled: state.rewriteEnabled,
        contentWidth: state.contentWidth,
        customContentWidth: state.customContentWidth,
        updateSettings: state.updateSettings,
      })),
    )
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null)
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const mainRef = useRef<HTMLDivElement | null>(null)
  const homeTabNavigationRequestRef = useRef(0)

  useEffect(() => onUnauthorized(() => setAuthDialogOpen(true)), [])

  const resetMainScroll = useCallback(() => {
    if (mainRef.current) {
      mainRef.current.scrollTop = 0
    }
  }, [])

  const scrollMainToTop = useCallback(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const navigateToStatusDetail = useCallback(
    (item: StatusDetailNavigationItem) => {
      const statusId = item.mblogId ?? item.id
      if (!item.author.id || !statusId) {
        return
      }
      navigate(`/${item.author.id}/${statusId}`)
    },
    [navigate],
  )

  const refreshTimeline = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['weibo', 'timeline'] })
  }, [queryClient])

  const onHomeTabChange = useCallback(
    (tab: HomeTab) => {
      const requestId = ++homeTabNavigationRequestRef.current
      if (tab === 'special-follow' || tab === 'friend-circle') {
        void updateSettings({ homeTab: tab, homeGroupId: null })
        void queryClient
          .ensureQueryData(followGroupsQueryOptions)
          .then((groups) => {
            if (requestId === homeTabNavigationRequestRef.current) {
              const group = getDefaultFollowGroupForHomeTab(groups.defaultGroups, tab)
              void updateSettings({ homeTab: tab, homeGroupId: group?.gid ?? null })
              navigate(group ? `/mygroups?gid=${group.gid}` : '/mygroups')
            }
          })
          .catch(() => {
            if (requestId === homeTabNavigationRequestRef.current) {
              void updateSettings({ homeTab: tab, homeGroupId: null })
              navigate(homeTimelinePathFromTab(tab))
            }
          })
        return
      }

      void updateSettings({ homeTab: tab, homeGroupId: null })
      navigate(homeTimelinePathFromTab(tab))
    },
    [navigate, queryClient, updateSettings],
  )

  const onFollowGroupChange = useCallback(
    (gid: string | null) => {
      ++homeTabNavigationRequestRef.current
      void updateSettings({ homeTab: 'following', homeGroupId: gid })
      if (gid) {
        navigate('/mygroups?gid=' + gid)
      } else {
        navigate('/mygroups')
      }
    },
    [navigate, updateSettings],
  )

  const context: AppShellContext = useMemo(
    () => ({
      page,
      navigateToStatusDetail,
      resetMainScroll,
      scrollMainToTop,
      composeTarget,
      setComposeTarget,
      viewingProfileUserId,
      onProfileUserIdChange: setViewingProfileUserId,
      onHomeTabChange,
      refreshTimeline,
      onFollowGroupChange,
    }),
    [
      page,
      navigateToStatusDetail,
      resetMainScroll,
      scrollMainToTop,
      composeTarget,
      viewingProfileUserId,
      onHomeTabChange,
      refreshTimeline,
      onFollowGroupChange,
    ],
  )

  const composeModal = (
    <CommentModal
      open={composeTarget !== null}
      target={composeTarget}
      onOpenChange={(open) => {
        if (!open) {
          setComposeTarget(null)
        }
      }}
    />
  )

  const statusCardHost = useMemo<StatusCardHost>(
    () => ({
      openStatus: navigateToStatusDetail,
      composeStatus: (status, mode) => setComposeTarget(composeTargetFromFeedItem(status, mode)),
    }),
    [navigateToStatusDetail],
  )

  if (!rewriteEnabled) {
    return (
      <>
        <RewritePausedCard onResume={() => void updateSettings({ rewriteEnabled: true })} />
        {composeModal}
        <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
      </>
    )
  }

  // When route is unsupported, shell-state hides the xb container and
  // restores Weibo's native UI. Skip rendering the shell frame here.
  if (page.kind === 'unsupported') {
    return null
  }

  return (
    <GenImageDialogProvider>
      <StatusCardHostProvider host={statusCardHost}>
        <ShellFrame
          pageKind={page.kind}
          viewingProfileUserId={viewingProfileUserId}
          rewriteEnabled={rewriteEnabled}
          theme={theme}
          contentWidth={contentWidth}
          customContentWidth={customContentWidth}
          onRewriteEnabledChange={(enabled: boolean) => {
            void updateSettings({ rewriteEnabled: enabled })
            if (!enabled) {
              window.location.reload()
            }
          }}
          onThemeChange={(nextTheme: typeof theme) => void updateSettings({ theme: nextTheme })}
          onSettingsOpen={() => setSettingsOpen(true)}
          onComposeOpen={() => setComposeOpen(true)}
          mainRef={mainRef}
        >
          <Outlet context={context} />
          {composeModal}
          <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
          <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
          <Suspense fallback={null}>
            <GenImageDialog />
          </Suspense>
          <AuthRequiredDialog
            open={authDialogOpen}
            onLogin={async () => {
              await updateSettings({ rewriteEnabled: false })
              window.location.href = 'https://weibo.com/newlogin'
            }}
          />
        </ShellFrame>
      </StatusCardHostProvider>
    </GenImageDialogProvider>
  )
}
