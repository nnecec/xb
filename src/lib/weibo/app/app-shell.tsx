import { useQueryClient } from '@tanstack/react-query'
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

import { useAppSettings } from '@/lib/app-settings-store'
import { RewritePausedCard, ShellFrame } from '@/lib/weibo/app/app-shell-layout'
import { AuthRequiredDialog } from '@/lib/weibo/components/auth-required-dialog'
import { CommentModal } from '@/lib/weibo/components/comment-modal'
import { ComposeDialog } from '@/lib/weibo/components/compose-dialog'
import { GenImageDialogProvider } from '@/lib/weibo/components/gen-image-dialog-context'
import { ProfileDialog } from '@/lib/weibo/components/profile-dialog'
import { SettingsDialog } from '@/lib/weibo/components/settings-dialog'
import { StatusDetailDialog } from '@/lib/weibo/components/status-detail-dialog'
import type { ComposeTarget } from '@/lib/weibo/models/compose'
import type { StatusDetailNavigationItem } from '@/lib/weibo/models/feed'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'
import { onUnauthorized } from '@/lib/weibo/services/auth-events'

type ProfileLookup = { uid: string } | { screenName: string }

const GenImageDialog = lazy(() =>
  import('@/lib/weibo/components/gen-image-dialog').then((m) => ({ default: m.GenImageDialog })),
)

function getHomeTimelinePath(tab: 'for-you' | 'following') {
  return tab === 'following' ? '/mygroups' : '/'
}

export interface AppShellContext {
  page: ReturnType<typeof useWeiboPage>
  navigateToStatusDetail: (item: StatusDetailNavigationItem) => void
  openStatusDetailDialog: (item: StatusDetailNavigationItem) => void
  navigateToProfile: (lookup: ProfileLookup) => void
  openProfileDialog: (lookup: ProfileLookup) => void
  resetMainScroll: () => void
  scrollMainToTop: () => void
  composeTarget: ComposeTarget | null
  setComposeTarget: (target: ComposeTarget | null) => void
  viewingProfileUserId: string | null
  onProfileUserIdChange: (userId: string | null) => void
  onHomeTabChange: (tab: 'for-you' | 'following') => void
  refreshTimeline: () => void
  onFollowGroupChange: (gid: string | null) => void
}

export function AppShell() {
  const navigate = useNavigate()
  const page = useWeiboPage()
  const queryClient = useQueryClient()

  const theme = useAppSettings((state) => state.theme)
  const rewriteEnabled = useAppSettings((state) => state.rewriteEnabled)
  const statusDetailPopupEnabled = useAppSettings((state) => state.statusDetailPopupEnabled)
  const statusDetailPopupPosition = useAppSettings((state) => state.statusDetailPopupPosition)
  const statusDetailPopupWidth = useAppSettings((state) => state.statusDetailPopupWidth)
  const browsingHistoryEnabled = useAppSettings((state) => state.browsingHistoryEnabled)
  const contentWidth = useAppSettings((state) => state.contentWidth)
  const setRewriteEnabled = useAppSettings((state) => state.setRewriteEnabled)
  const setTheme = useAppSettings((state) => state.setTheme)
  const [composeTarget, setComposeTarget] = useState<ComposeTarget | null>(null)
  const [viewingProfileUserId, setViewingProfileUserId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [authDialogOpen, setAuthDialogOpen] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)
  const [statusDetailDialogOpen, setStatusDetailDialogOpen] = useState(false)
  const [statusDetailItem, setStatusDetailItem] = useState<StatusDetailNavigationItem | null>(null)
  const [profileDialogOpen, setProfileDialogOpen] = useState(false)
  const [profileLookup, setProfileLookup] = useState<ProfileLookup | null>(null)
  const mainRef = useRef<HTMLDivElement | null>(null)

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
      if (statusDetailPopupEnabled) {
        setStatusDetailItem(item)
        setStatusDetailDialogOpen(true)
      } else {
        navigate(`/${item.author.id}/${statusId}`)
      }
    },
    [navigate, statusDetailPopupEnabled],
  )

  const openStatusDetailDialog = useCallback((item: StatusDetailNavigationItem) => {
    setStatusDetailItem(item)
    setStatusDetailDialogOpen(true)
  }, [])

  const navigateToProfile = useCallback(
    (lookup: ProfileLookup) => {
      if (statusDetailPopupEnabled) {
        setProfileLookup(lookup)
        setProfileDialogOpen(true)
      } else {
        if ('uid' in lookup && lookup.uid) {
          navigate(`/u/${lookup.uid}`)
        } else if ('screenName' in lookup && lookup.screenName) {
          navigate(`/n/${encodeURIComponent(lookup.screenName)}`)
        }
      }
    },
    [navigate, statusDetailPopupEnabled],
  )

  const openProfileDialog = useCallback((lookup: ProfileLookup) => {
    setProfileLookup(lookup)
    setProfileDialogOpen(true)
  }, [])

  const refreshTimeline = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['weibo', 'timeline'] })
  }, [queryClient])

  const onHomeTabChange = useCallback(
    (tab: 'for-you' | 'following') => navigate(getHomeTimelinePath(tab)),
    [navigate],
  )

  const onFollowGroupChange = useCallback(
    (gid: string | null) => {
      if (gid) {
        navigate('/mygroups?gid=' + gid)
      } else {
        navigate('/mygroups')
      }
    },
    [navigate],
  )

  const context: AppShellContext = useMemo(
    () => ({
      page,
      navigateToStatusDetail,
      openStatusDetailDialog,
      navigateToProfile,
      openProfileDialog,
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
      openStatusDetailDialog,
      navigateToProfile,
      openProfileDialog,
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

  if (!rewriteEnabled) {
    return (
      <>
        <RewritePausedCard onResume={() => void setRewriteEnabled(true)} />
        {composeModal}
        <ComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
        <StatusDetailDialog
          open={statusDetailDialogOpen}
          item={statusDetailItem}
          position={statusDetailPopupPosition}
          width={statusDetailPopupWidth}
          onOpenChange={setStatusDetailDialogOpen}
          setComposeTarget={setComposeTarget}
          onNavigate={navigateToStatusDetail}
        />
        <ProfileDialog
          open={profileDialogOpen}
          lookup={profileLookup}
          position={statusDetailPopupPosition}
          width={statusDetailPopupWidth}
          onOpenChange={setProfileDialogOpen}
          setComposeTarget={setComposeTarget}
          onNavigateStatusDetail={navigateToStatusDetail}
        />
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
      <ShellFrame
        pageKind={page.kind}
        viewingProfileUserId={viewingProfileUserId}
        rewriteEnabled={rewriteEnabled}
        theme={theme}
        contentWidth={contentWidth}
        browsingHistoryEnabled={browsingHistoryEnabled}
        onRewriteEnabledChange={(enabled: boolean) => {
          setRewriteEnabled(enabled)
          if (!enabled) {
            window.location.reload()
          }
        }}
        onThemeChange={(nextTheme: typeof theme) => void setTheme(nextTheme)}
        onSettingsOpen={() => setSettingsOpen(true)}
        onComposeOpen={() => setComposeOpen(true)}
        mainRef={mainRef}
        appShellContext={context}
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
            await setRewriteEnabled(false)
            window.location.href = 'https://weibo.com/newlogin'
          }}
        />
        <StatusDetailDialog
          open={statusDetailDialogOpen}
          item={statusDetailItem}
          position={statusDetailPopupPosition}
          width={statusDetailPopupWidth}
          onOpenChange={setStatusDetailDialogOpen}
          setComposeTarget={setComposeTarget}
          onNavigate={navigateToStatusDetail}
        />
        <ProfileDialog
          open={profileDialogOpen}
          lookup={profileLookup}
          position={statusDetailPopupPosition}
          width={statusDetailPopupWidth}
          onOpenChange={setProfileDialogOpen}
          setComposeTarget={setComposeTarget}
          onNavigateStatusDetail={navigateToStatusDetail}
        />
      </ShellFrame>
    </GenImageDialogProvider>
  )
}
