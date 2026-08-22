import { useInfiniteQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router'

import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { getContentWidthAdjustedMaxWidth } from '@/lib/weibo/app/content-width'
import { useImmersiveHeaderClassName } from '@/lib/weibo/app/immersive-header'
import { usePageRuntime } from '@/lib/weibo/app/page-runtime'
import { TimelineTopBar } from '@/lib/weibo/components/timeline-top-bar'
import { UserList } from '@/lib/weibo/components/user-list'
import { friendsInfiniteOptions } from '@/lib/weibo/data/weibo-data'

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
  const contentWidth = useAppSettings((state) => state.contentWidth)
  const customContentWidth = useAppSettings((state) => state.customContentWidth)
  const headerClassName = useImmersiveHeaderClassName(
    'bg-background/80 sticky top-0 z-10 border-b backdrop-blur-sm',
  )
  const query = useInfiniteQuery({
    ...friendsInfiniteOptions(uid, tab),
  })

  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  const errorMsg = query.data?.pages[0]?.errorMsg

  return (
    <div
      className={cn('w-full', showTabs && 'mx-auto')}
      style={
        showTabs
          ? { maxWidth: getContentWidthAdjustedMaxWidth(contentWidth, 672, customContentWidth) }
          : undefined
      }
    >
      {showTabs ? (
        <div className={headerClassName}>
          <div className="flex">
            {TABS.map((option) => (
              <button
                key={option.key}
                type="button"
                className={cn(
                  'relative flex-1 px-4 py-3 text-center text-sm font-medium transition-colors',
                  option.key === tab
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground/80',
                )}
                onClick={() => onTabChange?.(option.key)}
              >
                {option.label}
                {option.key === tab ? (
                  <span className="bg-foreground absolute inset-x-4 bottom-0 h-0.5 rounded-full" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <TimelineTopBar title={tab === 'fans' ? '粉丝' : '关注'} />
      )}

      <div className="py-2">
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
