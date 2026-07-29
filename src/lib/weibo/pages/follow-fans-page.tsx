import { useInfiniteQuery } from '@tanstack/react-query'
import { useParams, useSearchParams } from 'react-router'

import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { getContentWidthAdjustedMaxWidth } from '@/lib/weibo/app/content-width'
import { useImmersiveHeaderClassName } from '@/lib/weibo/app/immersive-header'
import { UserList } from '@/lib/weibo/components/user-list'
import { friendsInfiniteOptions } from '@/lib/weibo/data/weibo-data'

const TABS = [
  { key: 'following', label: '关注' },
  { key: 'fans', label: '粉丝' },
] as const

export function FollowFansPage() {
  const { uid } = useParams<{ uid: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const contentWidth = useAppSettings((state) => state.contentWidth)
  const customContentWidth = useAppSettings((state) => state.customContentWidth)
  const headerClassName = useImmersiveHeaderClassName(
    'bg-background/80 sticky top-0 z-10 border-b backdrop-blur-sm',
  )
  const activeTab = searchParams.get('tab') === 'fans' ? 'fans' : 'following'

  if (!uid) return null

  const query = useInfiniteQuery({
    ...friendsInfiniteOptions(uid, activeTab),
  })

  const items = query.data?.pages.flatMap((p) => p.items) ?? []
  const errorMsg = query.data?.pages[0]?.errorMsg

  return (
    <div
      className="mx-auto w-full"
      style={{ maxWidth: getContentWidthAdjustedMaxWidth(contentWidth, 672, customContentWidth) }}
    >
      <div className={headerClassName}>
        <div className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={cn(
                'relative flex-1 px-4 py-3 text-center text-sm font-medium transition-colors',
                activeTab === tab.key
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground/80',
              )}
              onClick={() => {
                setSearchParams({ tab: tab.key })
              }}
            >
              {tab.label}
              {activeTab === tab.key ? (
                <span className="bg-foreground absolute inset-x-4 bottom-0 h-0.5 rounded-full" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <div className="py-2">
        <UserList
          items={items}
          hasNextPage={query.hasNextPage ?? false}
          isFetchingNextPage={query.isFetchingNextPage}
          onLoadMore={() => query.fetchNextPage()}
          isLoading={query.isLoading}
          emptyLabel={activeTab === 'fans' ? '还没有粉丝' : '还没有关注'}
          msg={errorMsg}
        />
      </div>
    </div>
  )
}
