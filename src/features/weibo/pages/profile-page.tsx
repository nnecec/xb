import { skipToken, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

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
import { useWeiboPage } from '@/features/weibo/route/use-weibo-page'
import { loadProfileHoverCard, loadProfilePosts } from '@/features/weibo/services/weibo-repository'
import { useAppSettings } from '@/lib/app-settings-store'

function ProfilePostsTabs({
  profileId,
  onNavigate,
  onCommentClick,
  onRepostClick,
}: {
  profileId: string
  onNavigate: ReturnType<typeof useAppShellContext>['navigateToStatusDetail']
  onCommentClick: (item: Parameters<typeof composeTargetFromFeedItem>[0]) => void
  onRepostClick: (item: Parameters<typeof composeTargetFromFeedItem>[0]) => void
}) {
  const postsQuery = useQuery({
    queryKey: ['weibo', 'profile', 'posts', profileId],
    queryFn: () => loadProfilePosts(profileId),
    enabled: profileId !== '',
  })

  const errorMessage = postsQuery.error instanceof Error ? postsQuery.error.message : null

  if (postsQuery.isLoading) {
    return <PageLoadingState label="正在加载此用户微博..." />
  }

  if (errorMessage) {
    return <PageErrorState description={errorMessage} />
  }

  return (
    <Tabs defaultValue="posts" className="flex flex-col gap-4">
      <TabsList className="sticky top-0 z-10 grid w-full grid-cols-2">
        <TabsTrigger value="posts">微博</TabsTrigger>
        <TabsTrigger value="pictures">图片</TabsTrigger>
      </TabsList>

      <TabsContent value="posts" className="flex flex-col gap-4">
        <FeedList
          items={postsQuery.data?.items ?? []}
          emptyLabel="暂时还没有微博内容"
          onNavigate={onNavigate}
          onCommentClick={onCommentClick}
          onRepostClick={onRepostClick}
        />
      </TabsContent>

      <TabsContent value="pictures" className="flex flex-col gap-0">
        <PageEmptyState label="暂时还没有媒体内容" />
      </TabsContent>
    </Tabs>
  )
}

export function ProfilePage() {
  const ctx = useAppShellContext()
  const page = useWeiboPage()
  const rewriteEnabled = useAppSettings((s) => s.rewriteEnabled)

  const profileLookup = profileLookupFromPage(page)
  const isEnabled = rewriteEnabled && page.kind === 'profile'

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
  }, [ctx, profileQuery.data?.id])

  const errorMessage = profileQuery.error instanceof Error ? profileQuery.error.message : null

  return (
    <div>
      {profileQuery.isLoading ? <PageLoadingState label="正在加载此用户主页..." /> : null}
      {!profileQuery.isLoading && errorMessage ? (
        <PageErrorState description={errorMessage} />
      ) : null}
      {!profileQuery.isLoading && !errorMessage && profileQuery.data ? (
        <div className="flex flex-col gap-4">
          <ProfileHeader profile={profileQuery.data} />
          <ProfilePostsTabs
            profileId={profileQuery.data.id}
            onNavigate={ctx.navigateToStatusDetail}
            onCommentClick={(item) =>
              ctx.setComposeTarget(composeTargetFromFeedItem(item, 'comment'))
            }
            onRepostClick={(item) =>
              ctx.setComposeTarget(composeTargetFromFeedItem(item, 'repost'))
            }
          />
        </div>
      ) : null}
    </div>
  )
}
