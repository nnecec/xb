import {
  matchQuery,
  MutationCache,
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'

import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/features/weibo/app/app-shell'
import { AppErrorBoundary } from '@/features/weibo/app/error-boundary'
import { usePrewarmEmoticonConfig } from '@/features/weibo/app/emoticon-query'
import { UnsupportedPageContent } from '@/features/weibo/app/pages/unsupported-page-content'
import { WeiboHistorySync } from '@/features/weibo/app/weibo-history-sync'
import { FavoritesPage } from '@/features/weibo/pages/favorites-page'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'
import { NotificationsPage } from '@/features/weibo/pages/notifications-page'
import { ProfilePage } from '@/features/weibo/pages/profile-page'
import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'

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
    },
  },
})

function AppRootBootstrap() {
  usePrewarmEmoticonConfig()
  return (
    <BrowserRouter>
      <WeiboHistorySync />
      <Routes>
        <Route path="*" element={<AppShell />}>
          <Route index element={<HomeTimelinePage />} />
          <Route path="mygroups" element={<HomeTimelinePage />} />
          <Route path=":authorId/:statusId" element={<StatusDetailPage />} />
          <Route path="u/:uid" element={<ProfilePage />} />
          <Route path="u/page/fav/:uid" element={<FavoritesPage />} />
          <Route path="n/:uname" element={<ProfilePage />} />
          <Route path="unsupported" element={<UnsupportedPageContent />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <AppRootBootstrap />
        <Toaster />
      </AppErrorBoundary>
    </QueryClientProvider>
  )
}
