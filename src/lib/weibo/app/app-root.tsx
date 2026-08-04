import {
  matchQuery,
  MutationCache,
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query'
import { MotionConfig } from 'motion/react'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'

import { Toaster } from '@/components/ui/sonner'
import { Spinner } from '@/components/ui/spinner'
import { useAppSettings } from '@/lib/app-settings-store'
import { AppShell } from '@/lib/weibo/app/app-shell'
import { usePrewarmEmoticonConfig } from '@/lib/weibo/app/emoticon-query'
import { AppErrorBoundary } from '@/lib/weibo/app/error-boundary'

const ExplorePage = lazy(() =>
  import('@/lib/weibo/pages/explore-page').then((m) => ({ default: m.ExplorePage })),
)
const FavoritesPage = lazy(() =>
  import('@/lib/weibo/pages/favorites-page').then((m) => ({ default: m.FavoritesPage })),
)
const FollowFansPage = lazy(() =>
  import('@/lib/weibo/pages/follow-fans-page').then((m) => ({ default: m.FollowFansPage })),
)
const HomeTimelinePage = lazy(() =>
  import('@/lib/weibo/pages/home-timeline-page').then((m) => ({ default: m.HomeTimelinePage })),
)
const LikedStatusesPage = lazy(() =>
  import('@/lib/weibo/pages/liked-statuses-page').then((m) => ({
    default: m.LikedStatusesPage,
  })),
)
const NotificationsPage = lazy(() =>
  import('@/lib/weibo/pages/notifications-page').then((m) => ({ default: m.NotificationsPage })),
)
const ProfilePage = lazy(() =>
  import('@/lib/weibo/pages/profile-page').then((m) => ({ default: m.ProfilePage })),
)
const StatusDetailPage = lazy(() =>
  import('@/lib/weibo/pages/status-detail-page').then((m) => ({ default: m.StatusDetailPage })),
)
const HistoryPage = lazy(() =>
  import('@/lib/weibo/pages/history-page').then((m) => ({ default: m.HistoryPage })),
)
const TopicPage = lazy(() =>
  import('@/lib/weibo/pages/topic-page').then((m) => ({ default: m.TopicPage })),
)

const queryClient = new QueryClient({
  mutationCache: new MutationCache({
    onSuccess(data, variables, context, mutation) {
      const invalidates = mutation.meta?.invalidates as QueryKey[] | undefined

      if (invalidates) {
        queryClient.invalidateQueries({
          predicate: (query) =>
            invalidates.some((queryKey: QueryKey) => matchQuery({ queryKey }, query)),
        })
      }
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchInterval: false,
      retry: 1,
    },
  },
})

function PageLoadingFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner size="sm" />
    </div>
  )
}

function AppRootBootstrap() {
  usePrewarmEmoticonConfig()
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoadingFallback />}>
        <Routes>
          <Route path="*" element={<AppShell />}>
            <Route index element={<HomeTimelinePage />} />
            <Route path="mygroups" element={<HomeTimelinePage />} />
            <Route path="explore" element={<ExplorePage />} />
            <Route path="hot/weibo/:groupId" element={<ExplorePage />} />
            <Route path=":authorId/:statusId" element={<StatusDetailPage />} />
            <Route path="u/:uid" element={<ProfilePage />} />
            <Route path="u/page/fav/:uid" element={<FavoritesPage />} />
            <Route path="u/page/like/:uid" element={<LikedStatusesPage />} />
            <Route path="n/:uname" element={<ProfilePage />} />
            <Route path="topic" element={<TopicPage />} />
            <Route path="u/page/follow/:uid" element={<FollowFansPage />} />
            <Route path="at/weibo" element={<NotificationsPage />} />
            <Route path="comment/inbox" element={<NotificationsPage />} />
            <Route path="like/inbox" element={<NotificationsPage />} />
            <Route path="history" element={<HistoryPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export function AppRoot() {
  const motionPreference = useAppSettings((state) => state.motionPreference)
  const reducedMotion =
    motionPreference === 'reduced' ? 'always' : motionPreference === 'full' ? 'never' : 'user'

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <MotionConfig reducedMotion={reducedMotion}>
          <AppRootBootstrap />
          <Toaster />
        </MotionConfig>
      </AppErrorBoundary>
    </QueryClientProvider>
  )
}
