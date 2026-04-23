import { useMediaQuery } from '@reactuses/core'
import {
  Bell,
  Bookmark,
  Compass,
  House,
  RefreshCw,
  Settings,
  UserRound,
  ZapOff,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { Button } from '@/components/ui/button'
import type { AppTheme } from '@/lib/app-settings'
import { cn } from '@/lib/utils'
import { ThemeModeToggle } from '@/lib/weibo/components/theme-mode-toggle'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'

export function NavigationRail({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
  onRefresh,
  onSettingsOpen,
}: {
  pageKind: WeiboPageDescriptor['kind']
  /** Resolved numeric user id when on a profile page (from API); used to match logged-in user. */
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  onRefresh?: () => void
  onSettingsOpen: () => void
}) {
  const currentUserUid = useMemo(() => getCurrentUserUid(), [])
  const navigate = useNavigate()
  const [isHomeHovered, setIsHomeHovered] = useState(false)
  const isHomePage = pageKind === 'home'

  const profileHref = useMemo(
    () => (currentUserUid ? `/u/${currentUserUid}` : '/'),
    [currentUserUid],
  )
  const favoritesHref = useMemo(
    () => (currentUserUid ? `/u/page/fav/${currentUserUid}` : '/'),
    [currentUserUid],
  )
  const isOwnProfileActive =
    pageKind === 'profile' &&
    Boolean(currentUserUid) &&
    Boolean(viewingProfileUserId) &&
    currentUserUid === viewingProfileUserId
  const isFavoritesActive = pageKind === 'favorites'

  const isXl = useMediaQuery('(min-width: 1280px)')

  const handleHomeClick = () => {
    if (isHomePage && onRefresh) {
      onRefresh()
    } else {
      navigate('/')
    }
  }

  return (
    <aside className="flex h-full min-h-0 flex-col px-1 py-3 md:px-2 md:py-4 xl:px-3 xl:py-5">
      <div className="mb-3 flex justify-start md:mb-4 xl:mb-5">
        <img
          src={WeiboLogo}
          alt="微博 Logo"
          className="h-9 w-9 translate-y-[1px] fill-current object-contain"
        />
      </div>

      <nav aria-label="主导航" className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleHomeClick}
            onMouseEnter={() => setIsHomeHovered(true)}
            onMouseLeave={() => setIsHomeHovered(false)}
            title={isHomePage && isHomeHovered ? '刷新' : '主页'}
            aria-label={isHomePage && isHomeHovered ? '刷新' : '主页'}
            aria-current={isOwnProfileActive ? undefined : isHomePage ? 'page' : undefined}
            variant={isOwnProfileActive ? 'ghost' : isHomePage ? 'default' : 'ghost'}
            className={isXl ? 'justify-start' : 'justify-center'}
            size={isXl ? 'lg' : 'icon'}
          >
            {isHomePage && isHomeHovered ? (
              <RefreshCw aria-hidden="true" className="size-4 shrink-0" />
            ) : (
              <House aria-hidden="true" className="size-4 shrink-0" />
            )}
            <span className={cn('hidden xl:inline')}>
              {isHomePage && isHomeHovered ? '刷新' : '主页'}
            </span>
          </Button>

          <Button
            variant="ghost"
            className={isXl ? 'justify-start' : 'justify-center'}
            size={isXl ? 'lg' : 'icon'}
            disabled
          >
            <Compass aria-hidden="true" className="size-4 shrink-0" />
            <span className={cn('hidden xl:inline')}>探索</span>
          </Button>

          <Button
            variant={isFavoritesActive ? 'default' : 'ghost'}
            className={isXl ? 'justify-start' : 'justify-center'}
            size={isXl ? 'lg' : 'icon'}
            onClick={() => navigate(favoritesHref)}
            title="收藏"
            aria-label="收藏"
            aria-current={isFavoritesActive ? 'page' : undefined}
          >
            <Bookmark aria-hidden="true" className="size-4 shrink-0" />
            <span className={cn('hidden xl:inline')}>收藏</span>
          </Button>

          <Button
            variant={pageKind === 'notifications' ? 'default' : 'ghost'}
            className={isXl ? 'justify-start' : 'justify-center'}
            size={isXl ? 'lg' : 'icon'}
            onClick={() => navigate('/at/weibo')}
            title="通知"
            aria-label="通知"
            aria-current={pageKind === 'notifications' ? 'page' : undefined}
          >
            <Bell aria-hidden="true" className="size-4 shrink-0" />
            <span className={cn('hidden xl:inline')}>通知</span>
          </Button>

          <Button
            onClick={() => navigate(profileHref)}
            title="个人主页"
            aria-label="个人主页"
            aria-current={isOwnProfileActive ? 'page' : undefined}
            variant={isOwnProfileActive ? 'default' : 'ghost'}
            className={isXl ? 'justify-start' : 'justify-center'}
            size={isXl ? 'lg' : 'icon'}
          >
            <UserRound aria-hidden="true" className="size-4 shrink-0" />
            <span className={cn('hidden xl:inline')}>个人主页</span>
          </Button>
        </div>

        <div className="border-border/60 mt-auto space-y-3 border-t pt-3 xl:w-[180px] xl:space-y-3.5 xl:pt-4">
          <div className="flex items-center justify-center xl:justify-between">
            <p className="text-muted-foreground hidden text-xs font-medium xl:block">设置</p>
            <Button type="button" size="icon" variant="secondary" onClick={onSettingsOpen}>
              <Settings className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex items-center justify-center xl:justify-between">
            <p className="text-muted-foreground hidden text-xs font-medium xl:block">返回原模式</p>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => onRewriteEnabledChange(!rewriteEnabled)}
              aria-pressed={rewriteEnabled}
              aria-label="切换 xb 重写"
            >
              <ZapOff className="size-4" aria-hidden="true" />
            </Button>
          </div>

          <div className="flex items-center justify-center xl:justify-between">
            <p className="text-muted-foreground hidden text-xs font-medium xl:block">深色模式</p>
            <ThemeModeToggle value={theme} onChange={onThemeChange} />
          </div>
        </div>
      </nav>
    </aside>
  )
}
