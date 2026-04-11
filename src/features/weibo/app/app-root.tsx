import {
  matchQuery,
  MutationCache,
  QueryClient,
  QueryClientProvider,
  type QueryKey,
} from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'

import { AppShell } from '@/features/weibo/app/app-shell'
import { usePrewarmEmoticonConfig } from '@/features/weibo/app/emoticon-query'
import { UnsupportedPageContent } from '@/features/weibo/app/pages/unsupported-page-content'
import { HomeTimelinePage } from '@/features/weibo/pages/home-timeline-page'
import { ProfilePage } from '@/features/weibo/pages/profile-page'
import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'
import { WeiboHistorySync } from '@/features/weibo/app/weibo-history-sync'

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
          <Route path="n/:uname" element={<ProfilePage />} />
          <Route path="unsupported" element={<UnsupportedPageContent />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRootBootstrap />
      <Toaster richColors position="top-center" />
    </QueryClientProvider>
  )
}
