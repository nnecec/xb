import { skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'

import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { InfiniteFeedList } from '@/lib/weibo/components/infinite-feed-list'
import { PageErrorState, PageLoadingState } from '@/lib/weibo/components/page-state'
import { ProfileHeader } from '@/lib/weibo/components/profile-header'
import { ProfileSearchBar } from '@/lib/weibo/components/profile-search-bar'
import {
  profileLookupFromPage,
  profilePostsInfiniteOptions,
  profileSearchInfiniteOptions,
} from '@/lib/weibo/data/weibo-data'
import { loadProfileHoverCard } from '@/lib/weibo/data/weibo-data'
import type { TimelinePage } from '@/lib/weibo/models/feed'
import {
  parseProfileSearchUrlState,
  profileSearchStateKey,
  writeProfileSearchParams,
} from '@/lib/weibo/route/profile-search-params'
import { useWeiboPage } from '@/lib/weibo/route/use-weibo-page'

function ProfilePostsFeed({
  profileId,
  searchState,
  searchBarKey,
  searchParams,
  setSearchParams,
}: {
  profileId: string
  searchState: ReturnType<typeof parseProfileSearchUrlState>
  searchBarKey: string
  searchParams: URLSearchParams
  setSearchParams: ReturnType<typeof useSearchParams>[1]
}) {
  const postsQuery = useInfiniteQuery({
    ...profilePostsInfiniteOptions(profileId),
    enabled: profileId !== '' && !searchState.active,
  })
  const searchQuery = useInfiniteQuery({
    ...profileSearchInfiniteOptions(profileId, searchState.params),
    enabled: profileId !== '' && searchState.active,
  })

  const activeQuery = searchState.active ? searchQuery : postsQuery
  const errorMessage =
    activeQuery.error instanceof Error && !activeQuery.isFetchNextPageError
      ? activeQuery.error.message
      : null
  const loadMoreErrorMessage =
    activeQuery.error instanceof Error && activeQuery.isFetchNextPageError
      ? activeQuery.error.message
      : null
  const hasNextPage = Boolean(activeQuery.hasNextPage)
  const isFetchingNextPage = activeQuery.isFetchingNextPage
  const total = searchQuery.data?.pages[0]?.total

  return (
    <div className="flex flex-col gap-4">
      <ProfileSearchBar
        key={searchBarKey}
        state={searchState}
        resultTotal={total}
        isSearching={searchQuery.isFetching}
        onSubmit={(params) => {
          setSearchParams(writeProfileSearchParams(searchParams, { active: true, params }))
        }}
        onClear={() => {
          setSearchParams(
            writeProfileSearchParams(searchParams, { active: false, params: searchState.params }),
          )
        }}
      />
      <InfiniteFeedList
        pages={activeQuery.data?.pages as TimelinePage[] | undefined}
        emptyLabel={searchState.active ? '没有找到相关微博' : '暂时还没有微博内容'}
        loadingLabel={searchState.active ? '正在搜索此用户微博…' : '正在加载此用户微博…'}
        errorMessage={errorMessage}
        loadMoreErrorMessage={loadMoreErrorMessage}
        isLoading={activeQuery.isLoading}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={activeQuery.fetchNextPage}
        onRetry={() => void activeQuery.refetch()}
        className="flex flex-col gap-4"
      />
    </div>
  )
}

export function ProfilePage() {
  const ctx = useAppShellContext()
  const page = useWeiboPage()
  const [searchParams, setSearchParams] = useSearchParams()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const profileLookup = profileLookupFromPage(page)
  const isEnabled = rewriteEnabled && page.kind === 'profile'
  const searchState = useMemo(() => parseProfileSearchUrlState(searchParams), [searchParams])
  const searchBarKey = profileSearchStateKey(searchState)

  const profileQuery = useQuery({
    queryKey: [
      'weibo',
      'profile',
      'info',
      profileLookup ? ('uid' in profileLookup ? 'u' : 'n') : null,
      profileLookup
        ? 'uid' in profileLookup
          ? profileLookup.uid
          : profileLookup.screenName
        : null,
    ],
    queryFn: profileLookup ? () => loadProfileHoverCard(profileLookup) : skipToken,
    enabled: isEnabled && profileLookup !== null,
  })

  useEffect(() => {
    ctx.onProfileUserIdChange(profileQuery.data?.id ?? null)
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
  }, [ctx.onProfileUserIdChange, profileQuery.data?.id])

  const errorMessage = profileQuery.error instanceof Error ? profileQuery.error.message : null

  return (
    <div className="pt-4">
      {profileQuery.isLoading ? <PageLoadingState label="正在加载此用户主页…" /> : null}
      {!profileQuery.isLoading && errorMessage ? (
        <PageErrorState description={errorMessage} />
      ) : null}
      {!profileQuery.isLoading && !errorMessage && profileQuery.data ? (
        <div className="flex flex-col gap-4">
          <ProfileHeader profile={profileQuery.data} />
          <ProfilePostsFeed
            profileId={profileQuery.data.id}
            searchState={searchState}
            searchBarKey={searchBarKey}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />
        </div>
      ) : null}
    </div>
  )
}
