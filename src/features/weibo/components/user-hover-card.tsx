import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { loadProfileHoverCard } from "@/features/weibo/services/weibo-repository";

function UserHoverCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-20 rounded-t-xl bg-muted" />
      <div className="px-4 pb-4">
        <div className="-mt-6 mb-3 size-14 rounded-full bg-muted ring-3 ring-card" />
        <div className="mb-2 h-4 w-24 rounded bg-muted" />
        <div className="mb-3 h-3 w-40 rounded bg-muted" />
        <div className="flex gap-4">
          <div className="h-3 w-16 rounded bg-muted" />
          <div className="h-3 w-16 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

type UserHoverCardProps =
  | { uid: string; screenName?: undefined; children: ReactNode }
  | { screenName: string; uid?: undefined; children: ReactNode };

export function UserHoverCard(props: UserHoverCardProps) {
  const { children } = props;
  const uid = "uid" in props ? props.uid : undefined;
  const screenName = "screenName" in props ? props.screenName : undefined;

  const [hasOpened, setHasOpened] = useState(false);

  const { data: profile, isLoading } = useQuery({
    queryKey: ["weibo", "profile-hover", uid ?? "", screenName ?? ""],
    queryFn: () =>
      screenName
        ? loadProfileHoverCard({ screenName })
        : loadProfileHoverCard({ uid: uid ?? "" }),
    enabled: hasOpened && (screenName ? Boolean(screenName) : Boolean(uid)),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <HoverCard onOpenChange={(open) => { if (open) setHasOpened(true); }}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-80 overflow-hidden">
        {isLoading || !profile ? (
          <UserHoverCardSkeleton />
        ) : (
          <div>
            <div className="relative h-20">
              {profile.bannerUrl ? (
                <img
                  src={profile.bannerUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-linear-to-r from-blue-400 to-purple-500" />
              )}
            </div>

            <div className="px-4 pb-4">
              <div className="-mt-8 mb-2 flex items-end gap-3">
                <Avatar className="size-14 ring-3 ring-card">
                  <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.name} />
                  <AvatarFallback className="text-lg font-semibold">
                    {profile.name?.slice(0, 1).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
              </div>

              <p className="text-base font-bold leading-tight text-foreground">
                {profile.name}
              </p>

              {profile.descText ? (
                <p className="mt-0.5 text-xs text-muted-foreground" title="认证信息">
                  {profile.descText}
                </p>
              ) : null}

              {profile.bio ? (
                <p className="mt-2 text-sm leading-snug text-foreground" title="简介">
                  {profile.bio}
                </p>
              ) : null}

              {profile.ipLocation ? (
                <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="size-3" />
                  <span>{profile.ipLocation}</span>
                </div>
              ) : null}

              <div className="mt-3 flex items-center gap-4 text-sm">
                {profile.friendsCount != null ? (
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{profile.friendsCount}</span>{" "}
                    关注
                  </span>
                ) : null}
                {profile.followersCount ? (
                  <span className="text-muted-foreground">
                    <span className="font-semibold text-foreground">{profile.followersCount}</span>{" "}
                    粉丝
                  </span>
                ) : null}
              </div>

              {profile.mutualFollowers.length > 0 ? (
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    {profile.mutualFollowers.slice(0, 3).map((follower) => (
                      <Avatar key={follower.screenName} className="size-5 ring-2 ring-card">
                        <AvatarImage src={follower.avatarUrl} alt={follower.screenName} />
                        <AvatarFallback className="text-[10px]">
                          {follower.screenName?.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                  </div>
                  <p className="flex-1 text-xs leading-tight text-muted-foreground">
                    {profile.mutualFollowers
                      .slice(0, 2)
                      .map((f) => `@${f.screenName}`)
                      .join(" ")}
                    {(profile.mutualFollowerTotal ?? 0) > 2
                      ? ` 等${profile.mutualFollowerTotal}人`
                      : ""}
                    也关注了TA
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </HoverCardContent>
    </HoverCard>
  );
}
