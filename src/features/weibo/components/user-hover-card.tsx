import { skipToken, useQuery } from '@tanstack/react-query'
import { MapPin, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import {
  formatProfileCount,
  ProfileBanner,
  ProfileMutualFollowers,
} from '@/features/weibo/components/profile-shared'
import { loadProfileHoverCard } from '@/features/weibo/services/weibo-repository'

import { FollowButton } from './follow-button'

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
  const navigate = useNavigate()

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
                <FollowButton
                  uid={profile.id}
                  following={profile.following}
                  followMe={profile.followMe}
                  className="z-10 float-right"
                />
              </div>

              <p className="text-foreground text-base leading-tight font-bold">{profile.name}</p>

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

              {profile.ipLocation ? (
                <div className="text-muted-foreground flex items-center gap-1 text-xs">
                  <MapPin className="size-3" />
                  <span>{profile.ipLocation}</span>
                </div>
              ) : null}

              <div className="flex items-center gap-4 text-sm">
                {profile.friendsCount != null ? (
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold">
                      {formatProfileCount(profile.friendsCount)}
                    </span>{' '}
                    关注
                  </span>
                ) : null}
                {profile.followersCount ? (
                  <span className="text-muted-foreground">
                    <span className="text-foreground font-semibold">{profile.followersCount}</span>{' '}
                    粉丝
                  </span>
                ) : null}
              </div>

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

              <Button
                variant="outline"
                className="w-full flex-1 gap-1.5"
                onClick={() => navigate(`/n/${encodeURIComponent(profile.name)}`)}
              >
                <UserRound className="size-3.5" />
                主页
              </Button>
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
