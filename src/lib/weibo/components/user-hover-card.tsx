import { skipToken, useQuery } from '@tanstack/react-query'
import { BadgeCheck, MapPin, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { useAppSettings } from '@/lib/app-settings-store'
import { FollowGroup } from '@/lib/weibo/components/follow-group'
import {
  formatProfileCount,
  ProfileBanner,
  ProfileMutualFollowers,
} from '@/lib/weibo/components/profile-shared'
import { RatingPanel } from '@/lib/weibo/components/rating-panel'
import { loadProfileHoverCard } from '@/lib/weibo/data/weibo-data'

function UserHoverCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-muted h-20" />
      <div className="px-4 pb-4">
        <div className="bg-muted ring-card -mt-6 mb-3 size-14 rounded-full ring-3" />
        <div className="bg-muted mb-2 h-4 w-24 rounded" />
        <div className="bg-muted mb-3 h-3 w-40 rounded" />
        <div className="flex gap-4">
          <div className="bg-muted h-3 w-16 rounded" />
          <div className="bg-muted h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  )
}

type UserHoverCardProps =
  | { uid: string; screenName?: undefined; children: ReactNode }
  | { screenName: string; uid?: undefined; children: ReactNode }

type ProfileHoverLookup = { uid: string } | { screenName: string }

function getProfileLookup(props: UserHoverCardProps): ProfileHoverLookup {
  if ('screenName' in props) {
    return { screenName: props.screenName as string }
  }

  return { uid: props.uid }
}

export function UserHoverCard(props: UserHoverCardProps) {
  const { children } = props
  const lookup = getProfileLookup(props)

  const [hasOpened, setHasOpened] = useState(false)

  const { data: profile, isLoading } = useQuery({
    queryKey: [
      'weibo',
      'profile-hover',
      'uid' in lookup ? 'u' : 'n',
      'uid' in lookup ? lookup.uid : lookup.screenName,
    ],
    queryFn: hasOpened ? () => loadProfileHoverCard(lookup) : skipToken,
    enabled: hasOpened,
  })

  const profileUid = profile?.id ?? ''
  const displayLocation = profile?.location ?? profile?.ipLocation ?? null
  const ratingEnabled = useAppSettings((s) => s.ratingEnabled)

  return (
    <HoverCard
      onOpenChange={(open) => {
        if (open) setHasOpened(true)
      }}
    >
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {isLoading || !profile ? (
          <UserHoverCardSkeleton />
        ) : (
          <div>
            <ProfileBanner
              bannerUrl={profile.bannerUrl}
              className="relative h-20"
              fallbackClassName="h-full w-full bg-linear-to-r from-blue-400 to-purple-500"
            />

            <div className="flex flex-col gap-2 px-4 pb-4">
              <div className="-mt-8 mb-2 flex items-end justify-between gap-3">
                <Avatar className="ring-card size-14 ring-3">
                  <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
                  <AvatarFallback className="text-lg font-semibold">
                    {profile.name?.slice(0, 1).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <FollowGroup
                  uid={profile.id}
                  following={profile.following}
                  followMe={profile.followMe}
                  specialFollowing={profile.specialFollow}
                  className="z-10 float-right"
                />
              </div>

              <div className="flex min-w-0 items-center gap-1.5">
                <p className="text-foreground truncate text-base leading-tight font-bold">
                  {profile.name}
                </p>
                {profile.verified ? (
                  <BadgeCheck className="size-4 shrink-0 fill-blue-500 text-white" />
                ) : null}
              </div>

              {profile.descText ? (
                <p className="text-muted-foreground text-xs" title="认证信息">
                  {profile.descText}
                </p>
              ) : null}

              {profile.bio ? (
                <p className="text-foreground text-sm leading-snug" title="简介">
                  {profile.bio}
                </p>
              ) : null}

              {displayLocation ? (
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="size-3" />
                  <span>{displayLocation}</span>
                </div>
              ) : null}

              <div className="flex items-center gap-4 text-sm">
                {profile.friendsCount != null ? (
                  <Link
                    to={`/u/page/follow/${profile.id}?tab=following`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="text-foreground font-semibold">
                      {formatProfileCount(profile.friendsCount)}
                    </span>{' '}
                    关注
                  </Link>
                ) : null}
                {profile.followersCount != null ? (
                  <Link
                    to={`/u/page/follow/${profile.id}?tab=fans`}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <span className="text-foreground font-semibold">
                      {profile.followersCountStr}
                    </span>{' '}
                    粉丝
                  </Link>
                ) : null}
              </div>

              {profileUid && ratingEnabled ? (
                <RatingPanel targetUid={profileUid} size="sm" />
              ) : null}

              <ProfileMutualFollowers
                followers={profile.mutualFollowers}
                total={profile.mutualFollowerTotal}
                className="flex items-center gap-2"
                avatarListClassName="flex -space-x-1.5"
                avatarClassName="size-5 ring-2 ring-card"
                avatarFallbackClassName="text-[10px]"
                textClassName="flex-1 text-xs leading-tight text-muted-foreground"
                renderText={(followers, total) =>
                  `${followers
                    .slice(0, 2)
                    .map((f) => `@${f.screenName}`)
                    .join(' ')}${(total ?? 0) > 2 ? ` 等${total}人` : ''}也关注了TA`
                }
              />

              <Link to={`/n/${encodeURIComponent(profile.name)}`}>
                <Button variant="outline" className="w-full flex-1 gap-1.5 py-2">
                  <UserRound className="size-3.5" />
                  主页
                </Button>
              </Link>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
