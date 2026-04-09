import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export interface MutualFollower {
  screenName: string
  avatarUrl: string
}

export function formatProfileCount(value: string | number | null): string {
  if (value == null) return '0'
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : value
  if (Number.isNaN(num)) return String(value)
  if (num >= 10000) return `${(num / 10000).toFixed(1)}万`
  return String(num)
}

export function ProfileBanner({
  bannerUrl,
  className,
  fallbackClassName,
}: {
  bannerUrl: string | null
  className: string
  fallbackClassName: string
}) {
  return (
    <div className={className}>
      {bannerUrl ? (
        <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className={fallbackClassName} />
      )}
    </div>
  )
}

export function ProfileMutualFollowers({
  followers,
  total,
  className,
  avatarListClassName,
  avatarClassName,
  avatarFallbackClassName,
  textClassName,
  renderText,
}: {
  followers: MutualFollower[]
  total: number | null
  className: string
  avatarListClassName: string
  avatarClassName: string
  avatarFallbackClassName: string
  textClassName: string
  renderText: (followers: MutualFollower[], total: number | null) => string
}) {
  if (followers.length === 0) {
    return null
  }

  return (
    <div className={className}>
      <div className={avatarListClassName}>
        {followers.slice(0, 3).map((follower) => (
          <Avatar key={follower.screenName} className={avatarClassName}>
            <AvatarImage src={follower.avatarUrl} alt={follower.screenName} />
            <AvatarFallback className={avatarFallbackClassName}>
              {follower.screenName?.slice(0, 1)}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
      <p className={textClassName}>{renderText(followers, total)}</p>
    </div>
  )
}
