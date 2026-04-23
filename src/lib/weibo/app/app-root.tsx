import {
  matchQuery,
  MutationCache,
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'

import { Toaster } from '@/components/ui/sonner'
import { AppShell } from '@/lib/weibo/app/app-shell'
import { usePrewarmEmoticonConfig } from '@/lib/weibo/app/emoticon-query'
import { AppErrorBoundary } from '@/lib/weibo/app/error-boundary'
import { UnsupportedPageContent } from '@/lib/weibo/app/pages/unsupported-page-content'
import { WeiboHistorySync } from '@/lib/weibo/app/weibo-history-sync'
import { FavoritesPage } from '@/lib/weibo/pages/favorites-page'
import { HomeTimelinePage } from '@/lib/weibo/pages/home-timeline-page'
import { NotificationsPage } from '@/lib/weibo/pages/notifications-page'
import { ProfilePage } from '@/lib/weibo/pages/profile-page'
import { StatusDetailPage } from '@/lib/weibo/pages/status-detail-page'

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
          <Route path="at/weibo" element={<NotificationsPage />} />
          <Route path="comment/inbox" element={<NotificationsPage />} />
          <Route path="like/inbox" element={<NotificationsPage />} />
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
