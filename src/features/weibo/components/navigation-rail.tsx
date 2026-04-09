import { House, UserRound, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { Button } from '@/components/ui/button'
import { ThemeModeToggle } from '@/features/weibo/components/theme-mode-toggle'
import { getCurrentUserUid } from '@/features/weibo/platform/current-user'
import type { WeiboPageDescriptor } from '@/features/weibo/route/page-descriptor'
import type { AppTheme } from '@/lib/app-settings'
import { cn } from '@/lib/utils'

export function NavigationRail({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
}: {
  pageKind: WeiboPageDescriptor['kind']
  /** Resolved numeric user id when on a profile page (from API); used to match logged-in user. */
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  /** @deprecated Navigation rail is now always responsive; this prop is ignored. */
  logoOnly?: boolean
}) {
  const currentUserUid = useMemo(() => getCurrentUserUid(), [])
  const navigate = useNavigate()
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

  return (
    <aside className="flex h-full min-h-0 flex-col px-1 md:px-2 xl:px-3">
      <div className="mb-3 flex justify-start md:mb-4 xl:mb-5">
        <img
          src={WeiboLogo}
          alt="Weibo Logo"
          className="h-11 w-11 translate-y-[1px] object-contain fill-current"
        />
      </div>

      <nav aria-label="Main navigation" className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-2">
          {navItems.map(({ icon: Icon, label, href, isActive }) => {
            return (
              <Button
                key={label}
                onClick={() => navigate(href)}
                title={label}
                aria-label={label}
                variant={isActive ? 'default' : 'ghost'}
                size="icon"
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span
                  className={cn(
                    'hidden text-xs xl:inline',
                    isActive ? 'text-background/90' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
              </Button>
            )
          })}
        </div>

        <div className="mt-auto space-y-3 border-t border-border/60 pt-3 xl:space-y-3.5 xl:pt-4">
          <div className="flex items-center justify-center xl:justify-between">
            <p className="hidden text-xs font-medium text-muted-foreground xl:block">返回原模式</p>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => onRewriteEnabledChange(!rewriteEnabled)}
              aria-pressed={rewriteEnabled}
              aria-label="Toggle xb rewrite"
              className="h-10 w-10 rounded-xl"
            >
              <Zap className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex items-center justify-center xl:justify-between">
            <p className="hidden text-xs font-medium text-muted-foreground xl:block">深色模式</p>
            <ThemeModeToggle value={theme} onChange={onThemeChange} />
          </div>
        </div>
      </nav>
    </aside>
  )
}
