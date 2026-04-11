import { useMemo, useState } from 'react'
import { useLocation } from 'react-router'

import { useAppShellContext } from '@/features/weibo/app/app-shell-layout'
import { useStatusPageData } from '@/features/weibo/app/app-shell-queries'
import { PageErrorState, PageLoadingState } from '@/features/weibo/components/page-state'
import { StatusDetailPage } from '@/features/weibo/pages/status-detail-page'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import { useAppSettings } from '@/lib/app-settings-store'

export function StatusPageContent() {
  const ctx = useAppShellContext()
  const location = useLocation()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)
  const [filterParam, setFilterParam] = useState<string | undefined>(undefined)

  const page = useMemo(
    () =>
      parseWeiboUrl(
        new URL(`${location.pathname}${location.search}`, window.location.origin).href,
      ),
    [location.pathname, location.search],
  )

  const isEnabled = rewriteEnabled && page.kind === 'status'
  const { statusDetailQuery, statusCommentsQuery, comments, filterGroup } = useStatusPageData({
    page,
    isEnabled,
    filterParam,
  })

  return (
    <div className="relative h-full mx-auto">
      {statusDetailQuery.isLoading ? (
        <PageLoadingState label="Loading this Weibo post..." />
      ) : null}
      {statusDetailQuery.error instanceof Error ? (
        <PageErrorState description={statusDetailQuery.error.message} />
      ) : null}
      {statusDetailQuery.data ? (
        <StatusDetailPage
          detail={statusDetailQuery.data}
          comments={comments}
          onStatusComment={ctx.setComposeTarget}
          onStatusRepost={ctx.setComposeTarget}
          onCommentReply={ctx.setComposeTarget}
          onNavigate={ctx.navigateToStatusDetail}
          hasNextPage={Boolean(statusCommentsQuery.hasNextPage)}
          isFetchingNextPage={statusCommentsQuery.isFetchingNextPage}
          onLoadNextPage={() => void statusCommentsQuery.fetchNextPage()}
          filterGroup={filterGroup}
          filterParam={filterParam}
          onFilterChange={setFilterParam}
        />
      ) : null}
    </div>
  )
}
