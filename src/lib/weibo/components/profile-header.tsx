import { BadgeCheck, CalendarDays, MapPin } from 'lucide-react'
import { Link } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { useAppSettings } from '@/lib/app-settings-store'
import { FollowGroup } from '@/lib/weibo/components/follow-group'
import {
  formatProfileCount,
  ProfileBanner,
  ProfileMutualFollowers as SharedProfileMutualFollowers,
} from '@/lib/weibo/components/profile-shared'
import { RatingPanel } from '@/lib/weibo/components/rating-panel'
import type { UserProfile } from '@/lib/weibo/models/profile'

function ProfileIdentity({ profile }: { profile: UserProfile }) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 items-end gap-4">
          <div className="-mt-11 shrink-0">
            <Avatar className="border-card bg-muted size-24 border-4 shadow-sm sm:size-28">
              <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
              <AvatarFallback className="text-3xl font-bold">
                {profile.name?.slice(0, 1).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="min-w-0 pb-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <h1 className="truncate text-2xl leading-tight font-extrabold tracking-normal">
                {profile.name}
              </h1>
              {profile.verified ? (
                <BadgeCheck className="size-5 shrink-0 fill-blue-500 text-white" />
              ) : null}
            </div>
            <p className="text-muted-foreground truncate text-sm">@{profile.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 gap-2 pb-1 sm:justify-end">
          <FollowGroup
            uid={profile.id}
            following={profile.following}
            followMe={profile.followMe}
            specialFollowing={profile.specialFollow}
            size="lg"
          />
        </div>
      </div>

      {profile.bio ? (
        <p className="mt-4 max-w-2xl text-[15px] leading-7 text-pretty">{profile.bio}</p>
      ) : null}
      {profile.descText ? (
        <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{profile.descText}</p>
      ) : null}
    </>
  )
}

function ProfileMetadata({ profile }: { profile: UserProfile }) {
  const displayLocation = profile.location ?? profile.ipLocation
  const hasStatusesCount = profile.statusesCount != null
  const hasFriendsCount = profile.friendsCount != null
  const hasFollowersCount = profile.followersCount != null
  const hasStats = hasStatusesCount || hasFriendsCount || hasFollowersCount

  return (
    <>
      <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        {displayLocation ? (
          <span className="flex items-center gap-1">
            <MapPin className="size-4" />
            {displayLocation}
          </span>
        ) : null}
        {profile.createdAt ? (
          <span className="flex items-center gap-1">
            <CalendarDays className="size-4" />
            {profile.createdAt} 加入微博
          </span>
        ) : null}
      </div>

      {hasStats ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
          {hasStatusesCount ? (
            <span className="text-muted-foreground">
              <span className="text-foreground font-semibold tabular-nums">
                {formatProfileCount(profile.statusesCount)}
              </span>{' '}
              微博
            </span>
          ) : null}
          {hasFriendsCount ? (
            <Link
              to={`/u/page/follow/${profile.id}?tab=following`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-foreground font-semibold tabular-nums">
                {formatProfileCount(profile.friendsCount)}
              </span>{' '}
              正在关注
            </Link>
          ) : null}
          {hasFollowersCount ? (
            <Link
              to={`/u/page/follow/${profile.id}?tab=fans`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <span className="text-foreground font-semibold tabular-nums">
                {formatProfileCount(profile.followersCount)}
              </span>{' '}
              粉丝
            </Link>
          ) : null}
        </div>
      ) : null}
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
  const ratingEnabled = useAppSettings((s) => s.ratingEnabled)
  return (
    <Card className="overflow-hidden py-0">
      <CardContent className="p-0">
        <ProfileBanner
          bannerUrl={profile.bannerUrl}
          className="bg-muted relative h-24 w-full overflow-hidden sm:h-30 lg:h-36"
          fallbackClassName="h-full w-full bg-linear-to-r from-sky-200 via-zinc-200 to-amber-200 dark:from-sky-950 dark:via-zinc-800 dark:to-amber-950"
        />
        <div className="relative px-5 pb-5">
          <ProfileIdentity profile={profile} />
          <ProfileMetadata profile={profile} />
          {ratingEnabled ? <RatingPanel targetUid={profile.id} size="md" className="mt-3" /> : null}
          <ProfileHeaderMutualFollowers profile={profile} />
        </div>
      </CardContent>
    </Card>
  )
}
