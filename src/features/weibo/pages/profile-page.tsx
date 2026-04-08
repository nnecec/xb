import { BadgeCheck, CalendarDays, MapPin } from 'lucide-react'
import { useNavigate } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FeedCard } from '@/features/weibo/components/feed-card'
import { PageEmptyState } from '@/features/weibo/components/page-state'
import type { FeedItem, TimelinePage } from '@/features/weibo/models/feed'
import type { UserProfile } from '@/features/weibo/models/profile'

function formatFollowerCount(value: string | number | null): string {
  if (value == null) return '0'
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : value
  if (Number.isNaN(num)) return String(value)
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}

function ProfileHeader({
  profile,
  postCount,
}: {
  profile: UserProfile
  onBack: () => void
  postCount: number
}) {
  return (
    <Card className="rounded-3xl">
      <CardHeader>
        <CardTitle>{profile.name}</CardTitle>
        <CardDescription>{postCount} 条微博</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {/* Banner */}
        <div className="relative aspect-3/1 w-full overflow-hidden bg-muted">
          {profile.bannerUrl ? (
            <img src={profile.bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-blue-400 via-purple-400 to-pink-400" />
          )}
        </div>

        {/* Avatar + action row */}
        <div className="relative px-4">
          <div className="flex items-end justify-between">
            <div className="-mt-[15%] relative">
              <Avatar className="size-[22%] min-h-20 min-w-20 max-h-[134px] max-w-[134px] border-4 border-background">
                <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
                <AvatarFallback className="text-3xl font-bold">
                  {profile.name?.slice(0, 1).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="flex gap-2 pb-3 pt-3">
              <Button variant="outline" size="sm" className="rounded-full font-semibold">
                关注
              </Button>
            </div>
          </div>

          {/* Name + handle */}
          <div className="mt-1 flex flex-col">
            <div className="flex items-center gap-1">
              <h1 className="text-xl font-extrabold leading-tight">{profile.name}</h1>
              {profile.descText ? <BadgeCheck className="size-5 fill-blue-500 text-white" /> : null}
            </div>
            <p className="text-sm text-muted-foreground">@{profile.name}</p>
          </div>

          {/* Bio */}
          {profile.bio ? <p className="mt-3 text-sm leading-relaxed">{profile.bio}</p> : null}

          {/* Certification / desc_text */}
          {profile.descText ? (
            <p className="mt-1 text-xs text-muted-foreground">{profile.descText}</p>
          ) : null}

          {/* Metadata row */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {profile.ipLocation ? (
              <span className="flex items-center gap-1">
                <MapPin className="size-4" />
                {profile.ipLocation}
              </span>
            ) : null}
            {profile.createdAt ? (
              <span className="flex items-center gap-1">
                <CalendarDays className="size-4" />
                {profile.createdAt} 加入微博
              </span>
            ) : null}
          </div>

          {/* Stats row */}
          <div className="mt-3 flex items-center gap-5 text-sm">
            {profile.friendsCount != null ? (
              <span className="text-muted-foreground">
                <span className="font-bold text-foreground">
                  {formatFollowerCount(profile.friendsCount)}
                </span>{' '}
                正在关注
              </span>
            ) : null}
            {profile.followersCount != null ? (
              <span className="text-muted-foreground">
                <span className="font-bold text-foreground">{profile.followersCount}</span> 粉丝
              </span>
            ) : null}
          </div>

          {/* Mutual followers */}
          {profile.mutualFollowers.length > 0 ? (
            <div className="mt-3 flex items-center gap-2">
              <div className="flex -space-x-2">
                {profile.mutualFollowers.slice(0, 3).map((follower) => (
                  <Avatar key={follower.screenName} className="size-5 border-2 border-background">
                    <AvatarImage src={follower.avatarUrl} alt={follower.screenName} />
                    <AvatarFallback className="text-[8px]">
                      {follower.screenName?.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {profile.mutualFollowers
                  .slice(0, 2)
                  .map((f) => f.screenName)
                  .join('、')}
                {(profile.mutualFollowerTotal ?? 0) > 2
                  ? ` 等${profile.mutualFollowerTotal}位共同关注`
                  : ' 也关注了TA'}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

export function ProfilePage({
  posts,
  profile,
  onCommentClick,
}: {
  posts: TimelinePage
  profile: UserProfile
  onCommentClick?: (item: FeedItem) => void
}) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-4">
      <ProfileHeader
        profile={profile}
        onBack={() => navigate('/')}
        postCount={posts.items.length}
      />

      <Tabs defaultValue="posts" className="flex flex-col gap-4 rounded-full">
        <TabsList className="sticky top-[52px] z-10 grid w-full grid-cols-2">
          <TabsTrigger value="posts" className="rounded-full">
            微博
          </TabsTrigger>
          <TabsTrigger value="pictures" className="rounded-full">
            图片
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="flex flex-col gap-4">
          {posts.items.length > 0 ? (
            posts.items.map((item) => (
              <FeedCard key={item.id} item={item} onCommentClick={onCommentClick} />
            ))
          ) : (
            <PageEmptyState label="暂时还没有微博内容" />
          )}
        </TabsContent>

        <TabsContent value="pictures" className="flex flex-col gap-0">
          <PageEmptyState label="暂时还没有媒体内容" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
