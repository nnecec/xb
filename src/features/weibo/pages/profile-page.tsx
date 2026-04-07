import type { TimelinePage } from '@/features/weibo/models/feed'
import type { UserProfile } from '@/features/weibo/models/profile'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

import { FeedCard } from '@/features/weibo/components/feed-card'
import { PageEmptyState } from '@/features/weibo/components/page-state'

export function ProfilePage({
  activeTab,
  posts,
  profile,
}: {
  activeTab: 'posts' | 'replies' | 'media'
  posts: TimelinePage
  profile: UserProfile
}) {
  return (
    <div className="flex flex-col gap-4">
      <section className="overflow-hidden rounded-[28px] border border-border/70 bg-card/95">
        <div className="h-32 bg-gradient-to-br from-muted via-muted/70 to-background" />
        <div className="flex flex-col gap-3 px-4 pb-4">
          <div className="-mt-10 flex size-20 items-center justify-center rounded-full border-4 border-background bg-muted text-xl font-semibold text-muted-foreground">
            {profile.name?.slice(0, 1).toUpperCase() || '?'}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold">{profile.name || 'Unknown profile'}</h1>
            <p className="text-sm text-muted-foreground">@{profile.id || 'unknown-user'}</p>
          </div>
          <p className="text-sm text-muted-foreground">{profile.bio || 'No bio available.'}</p>
        </div>
      </section>

      <Tabs value={activeTab} className="flex flex-col gap-4">
        <TabsList className="grid w-full grid-cols-3 rounded-full">
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="replies">Replies</TabsTrigger>
          <TabsTrigger value="media">Media</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="flex flex-col gap-3">
          {posts.items.length > 0
            ? posts.items.map((item) => <FeedCard key={item.id} item={item} />)
            : <PageEmptyState label="No profile posts are available for this tab yet." />}
        </TabsContent>
      </Tabs>
    </div>
  )
}
