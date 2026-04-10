import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router'

import { usePrewarmEmoticonConfig } from '@/features/weibo/app/emoticon-query'
import { AppShell } from '@/features/weibo/app/app-shell'
import { WeiboHistorySync } from '@/features/weibo/app/weibo-history-sync'

const queryClient = new QueryClient({
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
        <Route path="*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  )
}

export function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppRootBootstrap />
    </QueryClientProvider>
  )
}
