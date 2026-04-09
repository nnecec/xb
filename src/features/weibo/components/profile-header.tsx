import { BadgeCheck, CalendarDays, MapPin } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  formatProfileCount,
  ProfileBanner,
  ProfileMutualFollowers as SharedProfileMutualFollowers,
} from '@/features/weibo/components/profile-shared'
import type { UserProfile } from '@/features/weibo/models/profile'

function ProfileIdentity({ profile }: { profile: UserProfile }) {
  return (
    <>
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

      <div className="mt-1 flex flex-col">
        <div className="flex items-center gap-1">
          <h1 className="text-xl font-extrabold leading-tight">{profile.name}</h1>
          {profile.descText ? <BadgeCheck className="size-5 fill-blue-500 text-white" /> : null}
        </div>
        <p className="text-sm text-muted-foreground">@{profile.name}</p>
      </div>

      {profile.bio ? <p className="mt-3 text-sm leading-relaxed">{profile.bio}</p> : null}
      {profile.descText ? (
        <p className="mt-1 text-xs text-muted-foreground">{profile.descText}</p>
      ) : null}
    </>
  )
}

function ProfileMetadata({ profile }: { profile: UserProfile }) {
  return (
    <>
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

      <div className="mt-3 flex items-center gap-5 text-sm">
        {profile.friendsCount != null ? (
          <span className="text-muted-foreground">
            <span className="font-bold text-foreground">
              {formatProfileCount(profile.friendsCount)}
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
    </>
  )
}

function ProfileHeaderMutualFollowers({ profile }: { profile: UserProfile }) {
  return (
    <SharedProfileMutualFollowers
      followers={profile.mutualFollowers}
      total={profile.mutualFollowerTotal}
      className="mt-3 flex items-center gap-2"
      avatarListClassName="flex -space-x-2"
      avatarClassName="size-5 border-2 border-background"
      avatarFallbackClassName="text-[8px]"
      textClassName="text-xs text-muted-foreground"
      renderText={(followers, total) =>
        `${followers
          .slice(0, 2)
          .map((f) => f.screenName)
          .join('、')}${(total ?? 0) > 2 ? ` 等${total}位共同关注` : ' 也关注了TA'}`
      }
    />
  )
}

export function ProfileHeader({ profile }: { profile: UserProfile }) {
  return (
    <Card className="rounded-3xl pt-0 overflow-hidden">
      <CardContent className="p-0">
        <ProfileBanner
          bannerUrl={profile.bannerUrl}
          className="relative aspect-3/1 w-full overflow-hidden bg-muted"
          fallbackClassName="h-full w-full bg-linear-to-br from-blue-400 via-purple-400 to-pink-400"
        />
        <div className="relative px-4">
          <ProfileIdentity profile={profile} />
          <ProfileMetadata profile={profile} />
          <ProfileHeaderMutualFollowers profile={profile} />
        </div>
      </CardContent>
    </Card>
  )
}
