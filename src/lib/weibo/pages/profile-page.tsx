import { skipToken, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'

import { useAppSettings } from '@/lib/app-settings-store'
import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { usePageRuntime } from '@/lib/weibo/app/page-runtime'
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
  type ProfileSearchUrlState,
  profileSearchStateKey,
  writeProfileSearchParams,
} from '@/lib/weibo/route/profile-search-params'

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
  setSearchParams: (params: URLSearchParams) => void
}) {
  const scrollRootRef = usePageRuntime().scrollRootRef
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
        scrollRootRef={scrollRootRef}
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

function ProfileContent({
  page,
  searchParams,
  setSearchParams,
  onProfileUserIdChange,
}: {
  page: Extract<ReturnType<typeof usePageRuntime>['page'], { kind: 'profile' }>
  searchParams: URLSearchParams
  setSearchParams: (params: URLSearchParams) => void
  onProfileUserIdChange?: (userId: string | null) => void
}) {
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const profileLookup = profileLookupFromPage(page)
  const isEnabled = rewriteEnabled
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
    onProfileUserIdChange?.(profileQuery.data?.id ?? null)
    // oxlint-disable-next-line eslint-plugin-react-hooks/exhaustive-deps
  }, [onProfileUserIdChange, profileQuery.data?.id])

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

export function ProfilePage() {
  const page = usePageRuntime().page
  const { onProfileUserIdChange } = useAppShellContext()
  const [searchParams, setSearchParams] = useSearchParams()
  if (page.kind !== 'profile') return null

  return (
    <ProfileContent
      page={page}
      searchParams={searchParams}
      setSearchParams={(params) => setSearchParams(params)}
      onProfileUserIdChange={onProfileUserIdChange}
    />
  )
}

export function ProfileColumnPage({
  source,
}: {
  source: {
    profileId: string
    profileSource: 'u' | 'n'
    search?: ProfileSearchUrlState
  }
}) {
  const [searchParams, setSearchParams] = useState(() =>
    source.search
      ? writeProfileSearchParams(new URLSearchParams(), source.search)
      : new URLSearchParams(),
  )
  return (
    <ProfileContent
      page={{ kind: 'profile', ...source, tab: 'posts' }}
      searchParams={searchParams}
      setSearchParams={(params) => setSearchParams(new URLSearchParams(params))}
    />
  )
}
