import { skipToken, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { useLocation } from 'react-router'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppShellContext } from '@/features/weibo/app/app-shell-layout'
import { FeedList } from '@/features/weibo/components/feed-list'
import {
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from '@/features/weibo/components/page-state'
import { ProfileHeader } from '@/features/weibo/components/profile-header'
import { composeTargetFromFeedItem } from '@/features/weibo/models/compose'
import { profileLookupFromPage } from '@/features/weibo/queries/weibo-queries'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import { loadProfileHoverCard, loadProfilePosts } from '@/features/weibo/services/weibo-repository'
import { useAppSettings } from '@/lib/app-settings-store'

export function ProfilePage() {
  const ctx = useAppShellContext()
  const location = useLocation()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const page = useMemo(
    () =>
      parseWeiboUrl(new URL(`${location.pathname}${location.search}`, window.location.origin).href),
    [location.pathname, location.search],
  )

  const profileLookup = profileLookupFromPage(page)
  const isEnabled = rewriteEnabled && page.kind === 'profile'

  const profileInfoQuery = useQuery({
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

  const profilePostsQuery = useQuery({
    queryKey: ['weibo', 'profile', 'posts', profileInfoQuery.data?.id ?? null],
    queryFn: () => loadProfilePosts(profileInfoQuery.data!.id),
    enabled: isEnabled && Boolean(profileInfoQuery.data?.id),
  })

  useEffect(() => {
    ctx.onProfileUserIdChange(profileInfoQuery.data?.id ?? null)
  }, [ctx, profileInfoQuery.data?.id])

  const isLoading = profileInfoQuery.isLoading || profilePostsQuery.isLoading
  const errorMessage =
    (profileInfoQuery.error as Error | null)?.message ??
    (profilePostsQuery.error as Error | null)?.message ??
    null

  return (
    <div>
      {isLoading ? <PageLoadingState label="正在加载此用户主页..." /> : null}
      {!isLoading && errorMessage ? <PageErrorState description={errorMessage} /> : null}
      {!isLoading && !errorMessage && profileInfoQuery.data && profilePostsQuery.data ? (
        <div className="flex flex-col gap-4">
          <ProfileHeader profile={profileInfoQuery.data} />

          <Tabs defaultValue="posts" className="flex flex-col gap-4">
            <TabsList className="sticky top-0 z-10 grid w-full grid-cols-2">
              <TabsTrigger value="posts">微博</TabsTrigger>
              <TabsTrigger value="pictures">图片</TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="flex flex-col gap-4">
              <FeedList
                items={profilePostsQuery.data.items}
                emptyLabel="暂时还没有微博内容"
                onNavigate={ctx.navigateToStatusDetail}
                onCommentClick={(item) =>
                  ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))
                }
                onRepostClick={(item) =>
                  ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))
                }
              />
            </TabsContent>

            <TabsContent value="pictures" className="flex flex-col gap-0">
              <PageEmptyState label="暂时还没有媒体内容" />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
    </div>
  )
}
