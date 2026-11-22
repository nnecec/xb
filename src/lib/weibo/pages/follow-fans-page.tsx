import { useInfiniteQuery } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useParams, useSearchParams } from 'react-router'

import { usePageRuntime } from '@/lib/weibo/app/page-runtime'
import { TimelineTopBar, type TimelineTopBarOption } from '@/lib/weibo/components/timeline-top-bar'
import { UserList } from '@/lib/weibo/components/user-list'
import { friendsInfiniteOptions } from '@/lib/weibo/data/weibo-data'
import { useColumnPageRefresh } from '@/lib/weibo/workspace/column-page-toolbar'

const TABS = [
  { key: 'following', label: '关注' },
  { key: 'fans', label: '粉丝' },
] as const

export function FollowFansContent({
  uid,
  tab,
  showTabs = false,
  onTabChange,
}: {
  uid: string
  tab: 'following' | 'fans'
  showTabs?: boolean
  onTabChange?: (tab: 'following' | 'fans') => void
}) {
  const runtime = usePageRuntime()
  const query = useInfiniteQuery({
    ...friendsInfiniteOptions(uid, tab),
  })

  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  const errorMsg = query.data?.pages[0]?.errorMsg
  const refetchFriends = query.refetch
  const refreshFriends = useCallback(() => {
    void refetchFriends()
  }, [refetchFriends])
  useColumnPageRefresh(
    refreshFriends,
    query.isFetching && !query.isFetchingNextPage && !query.isLoading,
  )

  const titleOptions: TimelineTopBarOption<'following' | 'fans'>[] = TABS.map((option) => ({
    value: option.key,
    label: option.label,
  }))

  return (
    <div className="w-full">
      <TimelineTopBar
        title={tab === 'fans' ? '粉丝' : '关注'}
        titleValue={tab}
        titleOptions={showTabs ? titleOptions : undefined}
        onTitleChange={showTabs ? onTabChange : undefined}
        onRefresh={refreshFriends}
        isRefreshing={query.isFetching && !query.isFetchingNextPage && !query.isLoading}
      />

      <div>
        <UserList
          items={items}
          hasNextPage={query.hasNextPage ?? false}
          isFetchingNextPage={query.isFetchingNextPage}
          onLoadMore={() => query.fetchNextPage()}
          isLoading={query.isLoading}
          emptyLabel={tab === 'fans' ? '还没有粉丝' : '还没有关注'}
          msg={errorMsg}
          scrollRootRef={runtime.scrollRootRef}
        />
      </div>
    </div>
  )
}

export function FollowFansPage() {
  const { uid } = useParams<{ uid: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') === 'fans' ? 'fans' : 'following'

  if (!uid) return null

  return (
    <FollowFansContent
      uid={uid}
      tab={activeTab}
      showTabs
      onTabChange={(tab) => setSearchParams({ tab })}
    />
  )
}
