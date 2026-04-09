import { House, UserRound, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ThemeModeToggle } from '@/features/weibo/components/theme-mode-toggle'
import { getCurrentUserUid } from '@/features/weibo/platform/current-user'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import type { AppTheme } from '@/lib/app-settings'

export function NavigationRail({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
  logoOnly = false,
}: {
  pageKind: WeiboPageDescriptor['kind']
  /** Resolved numeric user id when on a profile page (from API); used to match logged-in user. */
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  logoOnly?: boolean
}) {
  const currentUserUid = useMemo(() => getCurrentUserUid(), [])

  const navItems = useMemo(() => {
    const profileHref = currentUserUid ? `/u/${currentUserUid}` : '/'
    const isOwnProfileActive =
      pageKind === 'profile' &&
      Boolean(currentUserUid) &&
      Boolean(viewingProfileUserId) &&
      currentUserUid === viewingProfileUserId

    return [
      {
        icon: House,
        label: 'Home',
        href: '/',
        isActive: pageKind === 'home' || pageKind === 'status',
      },
      {
        icon: UserRound,
        label: 'Profile',
        href: profileHref,
        isActive: isOwnProfileActive,
      },
    ]
  }, [currentUserUid, pageKind, viewingProfileUserId])
  const rootClasses = logoOnly
    ? 'flex h-full min-h-0 flex-col items-center rounded-[24px] border-border/70 px-2 py-3 shadow-none'
    : 'flex h-full min-h-0 flex-col rounded-[28px] border-border/70 shadow-none'

  const navItemClasses = logoOnly
    ? 'flex items-center justify-center rounded-2xl p-3 transition-colors'
    : 'flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-colors'

  return (
    <Card className={rootClasses}>
      <CardHeader className={logoOnly ? 'px-0 pb-3 pt-1' : undefined}>
        <CardTitle>
          <img src={WeiboLogo} alt="Weibo Logo" className="size-12" />
        </CardTitle>
        {!logoOnly && <CardDescription>随时随地发现新鲜事</CardDescription>}
      </CardHeader>
      <CardContent
        className={logoOnly ? 'flex flex-1 flex-col gap-4 px-0' : 'flex flex-1 flex-col gap-5 px-4'}
      >
        <div
          className={logoOnly ? 'flex flex-1 flex-col items-center gap-2' : 'flex flex-col gap-2'}
        >
          {navItems.map(({ icon: Icon, label, href, isActive }) => {
            return (
              <Link
                key={label}
                to={href}
                title={label}
                className={[
                  navItemClasses,
                  isActive
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                ].join(' ')}
              >
                <Icon aria-hidden="true" />
                {!logoOnly && <span>{label}</span>}
              </Link>
            )
          })}
        </div>
      </CardContent>
      <CardFooter>
        <div
          className={
            logoOnly
              ? 'mt-auto flex flex-col justify-center items-center gap-2'
              : 'mt-auto flex flex-col gap-3 rounded-2xl w-full'
          }
        >
          <div className={logoOnly ? '' : 'flex items-center justify-between'}>
            {!logoOnly && <p className="text-sm font-medium text-muted-foreground">返回原模式</p>}
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => onRewriteEnabledChange(!rewriteEnabled)}
              aria-label="Toggle xb rewrite"
              className={logoOnly ? 'h-10 w-10' : undefined}
            >
              <Zap className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className={logoOnly ? '' : 'flex items-center justify-between'}>
            {!logoOnly && <p className="text-sm font-medium text-muted-foreground">深色模式</p>}
            <ThemeModeToggle value={theme} onChange={onThemeChange} />
          </div>
        </div>
      </CardFooter>
    </Card>
  )
}
