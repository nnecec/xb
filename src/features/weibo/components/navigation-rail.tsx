import { useMediaQuery } from '@reactuses/core'
import { House, UserRound, Zap } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'

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
        label: '主页',
        href: '/',
        isActive: pageKind === 'home' || pageKind === 'status',
      },
      {
        icon: UserRound,
        label: '个人主页',
        href: profileHref,
        isActive: isOwnProfileActive,
      },
    ]
  }, [currentUserUid, pageKind, viewingProfileUserId])
  const isXl = useMediaQuery('(min-width: 1280px)')

  return (
    <aside className="flex h-full min-h-0 flex-col px-1 md:px-2 xl:px-3 py-3 md:py-4 xl:py-5">
      <div className="mb-3 flex justify-start md:mb-4 xl:mb-5">
        <img
          src={WeiboLogo}
          alt="微博 Logo"
          className="h-9 w-9 translate-y-[1px] object-contain fill-current"
        />
      </div>

      <nav aria-label="主导航" className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-2">
          {navItems.map(({ icon: Icon, label, href, isActive }) => {
            return (
              <Button
                key={label}
                onClick={() => navigate(href)}
                title={label}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
                variant={isActive ? 'default' : 'ghost'}
                className={isXl ? 'justify-start' : 'justify-center'}
                size={isXl ? 'lg' : 'icon'}
              >
                <Icon aria-hidden="true" className="size-4 shrink-0" />
                <span className={cn('hidden xl:inline')}>{label}</span>
              </Button>
            )
          })}
        </div>

        <div className="mt-auto space-y-3 border-t border-border/60 pt-3 xl:space-y-3.5 xl:pt-4 xl:w-[180px]">
          <div className="flex items-center justify-center xl:justify-between">
            <p className="hidden text-xs font-medium text-muted-foreground xl:block">返回原模式</p>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => onRewriteEnabledChange(!rewriteEnabled)}
              aria-pressed={rewriteEnabled}
              aria-label="切换 xb 重写"
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
