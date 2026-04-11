import { skipToken, useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { useLocation } from 'react-router'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAppShellContext } from '@/features/weibo/app/app-shell-layout'
import { BackToTop } from '@/features/weibo/components/back-to-top'
import { FeedList } from '@/features/weibo/components/feed-list'
import {
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from '@/features/weibo/components/page-state'
import { ProfileHeader } from '@/features/weibo/components/profile-header'
import { profileLookupFromPage } from '@/features/weibo/queries/weibo-queries'
import { parseWeiboUrl } from '@/features/weibo/route/parse-weibo-url'
import { loadProfileHoverCard, loadProfilePosts } from '@/features/weibo/services/weibo-repository'
import { useAppSettings } from '@/lib/app-settings-store'

export function ProfilePage() {
  const ctx = useAppShellContext()
  const location = useLocation()
  const scrollRef = useRef<HTMLDivElement>(null)
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
    <div ref={scrollRef} className="relative mx-auto h-full">
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
                  ctx.setComposeTarget({
                    kind: 'status',
                    mode: 'comment',
                    statusId: item.id,
                    targetCommentId: null,
                    authorName: item.author.name,
                    excerpt: item.text.trim().slice(0, 80),
                  })
                }
                onRepostClick={(item) =>
                  ctx.setComposeTarget({
                    kind: 'status',
                    mode: 'repost',
                    statusId: item.id,
                    targetCommentId: null,
                    authorName: item.author.name,
                    excerpt: item.text.trim().slice(0, 80),
                  })
                }
              />
            </TabsContent>

            <TabsContent value="pictures" className="flex flex-col gap-0">
              <PageEmptyState label="暂时还没有媒体内容" />
            </TabsContent>
          </Tabs>
        </div>
      ) : null}
      <BackToTop container={scrollRef.current} />
    </div>
  )
}
