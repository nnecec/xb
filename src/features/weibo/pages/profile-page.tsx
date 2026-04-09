import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedList } from '@/features/weibo/components/feed-list'
import { PageEmptyState } from '@/features/weibo/components/page-state'
import { ProfileHeader } from '@/features/weibo/components/profile-header'
import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'
import type { UserProfile } from '@/features/weibo/models/profile'

export function ProfilePage({
  posts,
  profile,
  onCommentClick,
}: {
  posts: TimelinePage
  profile: UserProfile
  onCommentClick?: (item: FeedItem) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <ProfileHeader profile={profile} />

      <Tabs defaultValue="posts" className="flex flex-col gap-4">
        <TabsList className="sticky top-0 z-10 grid w-full grid-cols-2 rounded-full">
          <TabsTrigger value="posts" className="rounded-full">
            微博
          </TabsTrigger>
          <TabsTrigger value="pictures" className="rounded-full">
            图片
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="flex flex-col gap-4">
          <FeedList
            items={posts.items}
            emptyLabel="暂时还没有微博内容"
            onCommentClick={onCommentClick}
          />
        </TabsContent>

        <TabsContent value="pictures" className="flex flex-col gap-0">
          <PageEmptyState label="暂时还没有媒体内容" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
