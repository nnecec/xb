import { useMediaQuery } from '@reactuses/core'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRightIcon, ChevronsLeftIcon, ChevronsRightIcon, Pencil } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { BellIcon } from '@/components/ui/bell'
import { BookmarkIcon } from '@/components/ui/bookmark'
import { Button } from '@/components/ui/button'
import { CogIcon } from '@/components/ui/cog'
import { CompassIcon } from '@/components/ui/compass'
import { HistoryIcon } from '@/components/ui/history'
import { HomeIcon } from '@/components/ui/home'
import { MessageSquareMoreIcon } from '@/components/ui/message-square-more'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { UserIcon } from '@/components/ui/user'
import { ZapOffIcon } from '@/components/ui/zap-off'
import type { AppTheme } from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { ThemeModeToggle } from '@/lib/weibo/components/theme-mode-toggle'
import {
  hasDmBadge,
  hasNotificationBadge,
  unreadNotificationsQueryOptions,
} from '@/lib/weibo/data/weibo-data'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'

function navButtonClassName(showLabel: boolean) {
  return cn('flex w-full items-center gap-2', showLabel ? 'justify-start' : 'justify-center')
}

function NavButton({
  children,
  label,
  showLabel,
  isActive,
  onClick,
  href,
  isExternal,
  variant,
  showBadge,
}: {
  children: React.ReactNode
  label: React.ReactNode
  showLabel: boolean
  isActive?: boolean
  onClick?: () => void
  href?: string
  isExternal?: boolean
  variant?: React.ComponentProps<typeof Button>['variant']
  showBadge?: boolean
}) {
  const buttonVariant = variant ?? (isActive ? 'secondary' : 'ghost')
  const iconWrap = (icon: React.ReactNode) =>
    showBadge ? (
      <span className="relative">
        {icon}
        <span className="bg-destructive absolute -top-1 -right-1 size-2 rounded-full" />
      </span>
    ) : (
      icon
    )
  const sharedClassName = navButtonClassName(showLabel)
  const button = href ? (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      aria-label={showLabel ? undefined : String(label)}
      aria-current={isActive ? 'page' : undefined}
    >
      <Button
        className={sharedClassName}
        variant={buttonVariant}
        onClick={onClick}
        size={showLabel ? 'default' : 'icon'}
      >
        {iconWrap(children)}
        {showLabel && <span>{label}</span>}
      </Button>
    </a>
  ) : (
    <Button
      variant={buttonVariant}
      aria-label={showLabel ? undefined : String(label)}
      aria-current={isActive ? 'page' : undefined}
      className={sharedClassName}
      onClick={onClick}
      size={showLabel ? 'default' : 'icon'}
    >
      {iconWrap(children)}
      {showLabel && <span>{label}</span>}
    </Button>
  )

  return showLabel ? (
    button
  ) : (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}

function RailControl({
  label,
  isCollapsed,
  tooltip,
  children,
}: {
  label: string
  isCollapsed: boolean
  tooltip?: string
  children: React.ReactNode
}) {
  if (!isCollapsed) {
    return (
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        {children}
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center">{children}</div>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip ?? label}</TooltipContent>
    </Tooltip>
  )
}

interface NavigationRailProps {
  pageKind: WeiboPageDescriptor['kind']
  viewingProfileUserId?: string | null
  rewriteEnabled: boolean
  theme: AppTheme
  onRewriteEnabledChange: (enabled: boolean) => void
  onThemeChange: (theme: AppTheme) => void
  onSettingsOpen: () => void
  onComposeOpen: () => void
  onSidebarCollapsedChange: (collapsed: boolean) => void
}

export function NavigationRail({
  pageKind,
  viewingProfileUserId,
  rewriteEnabled,
  theme,
  onRewriteEnabledChange,
  onThemeChange,
  onSettingsOpen,
  onComposeOpen,
  onSidebarCollapsedChange,
}: NavigationRailProps) {
  const {
    homeTab,
    homeGroupId,
    showExplore,
    showFavorites,
    showHistory: showHistorySetting,
    showNotifications,
    showDMs,
    showProfile,
    showCompose,
    sidebarCollapsed,
  } = useAppSettings(
    useShallow((state) => ({
      homeTab: state.homeTab,
      homeGroupId: state.homeGroupId,
      showExplore: state.showExplore,
      showFavorites: state.showFavorites,
      showHistory: state.showHistory,
      showNotifications: state.showNotifications,
      showDMs: state.showDMs,
      showProfile: state.showProfile,
      showCompose: state.showCompose,
      sidebarCollapsed: state.sidebarCollapsed,
    })),
  )
  const currentUserUid = useMemo(() => getCurrentUserUid(), [])
  const navigate = useNavigate()
  const isXl = useMediaQuery('(min-width: 1280px)')
  const isCollapsed = !isXl || sidebarCollapsed

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
  const isSavedItemsActive = pageKind === 'favorites' || pageKind === 'liked'

  const shouldPollUnread = showNotifications || showDMs
  const { data: unreadCounts } = useQuery({
    ...unreadNotificationsQueryOptions,
    enabled: shouldPollUnread,
  })
  const showNotificationBadge = unreadCounts ? hasNotificationBadge(unreadCounts) : false
  const showDmBadge = unreadCounts ? hasDmBadge(unreadCounts) : false

  return (
    <TooltipProvider>
      <aside className="flex h-full min-h-0 flex-col px-1 py-3 md:px-2 md:py-4 xl:px-3 xl:py-5">
        <div className="mb-4 flex justify-start">
          <img
            src={WeiboLogo}
            alt="微博 Logo"
            className="h-8 w-8 translate-y-px fill-current object-contain opacity-80 transition-opacity duration-200 hover:opacity-100"
          />
        </div>

        <nav aria-label="主导航" className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-1">
            <NavButton
              label="主页"
              showLabel={!isCollapsed}
              isActive={!isOwnProfileActive && pageKind === 'home'}
              onClick={() => {
                if (homeGroupId) {
                  navigate('/mygroups?gid=' + homeGroupId)
                  return
                }
                navigate(homeTab === 'for-you' ? '/' : '/mygroups')
              }}
            >
              <HomeIcon aria-hidden="true" className="size-4 shrink-0" />
            </NavButton>

            {showExplore && (
              <NavButton
                label="探索"
                showLabel={!isCollapsed}
                isActive={pageKind === 'explore'}
                onClick={() => navigate('/hot/weibo/102803')}
              >
                <CompassIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showFavorites && (
              <NavButton
                label="收藏"
                showLabel={!isCollapsed}
                isActive={isSavedItemsActive}
                onClick={() => navigate(favoritesHref)}
              >
                <BookmarkIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showHistorySetting && (
              <NavButton
                label="历史"
                showLabel={!isCollapsed}
                isActive={pageKind === 'history'}
                onClick={() => navigate('/history')}
              >
                <HistoryIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showNotifications && (
              <NavButton
                label="通知"
                showLabel={!isCollapsed}
                isActive={pageKind === 'notifications'}
                showBadge={showNotificationBadge}
                onClick={() => navigate('/at/weibo')}
              >
                <BellIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showDMs && (
              <NavButton
                label={
                  <span className="flex items-center gap-1">
                    私信
                    <ArrowUpRightIcon className="size-3" />
                  </span>
                }
                showLabel={!isCollapsed}
                href="https://api.weibo.com/chat"
                isExternal
                showBadge={showDmBadge}
              >
                <MessageSquareMoreIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showProfile && (
              <NavButton
                label="我的"
                showLabel={!isCollapsed}
                isActive={isOwnProfileActive}
                onClick={() => navigate(profileHref)}
              >
                <UserIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showCompose && (
              <NavButton
                label="发微博"
                showLabel={!isCollapsed}
                onClick={onComposeOpen}
                variant="default"
              >
                <Pencil aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}
          </div>

          <div
            className={cn(
              'border-border/40 mt-auto space-y-3 border-t pt-3',
              !isCollapsed && 'w-[180px] space-y-3.5 pt-4',
            )}
          >
            <RailControl label="设置" isCollapsed={isCollapsed}>
              <Button type="button" size="icon" variant="secondary" onClick={onSettingsOpen}>
                <CogIcon className="size-4" aria-hidden="true" />
              </Button>
            </RailControl>

            <RailControl label="返回原模式" isCollapsed={isCollapsed}>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                onClick={() => onRewriteEnabledChange(!rewriteEnabled)}
                aria-pressed={rewriteEnabled}
                aria-label="切换 xb 重写"
              >
                <ZapOffIcon className="size-4" aria-hidden="true" />
              </Button>
            </RailControl>

            <RailControl label="深色模式" isCollapsed={isCollapsed}>
              <ThemeModeToggle value={theme} onChange={onThemeChange} />
            </RailControl>

            {isXl ? (
              <RailControl
                label="收起"
                isCollapsed={isCollapsed}
                tooltip={sidebarCollapsed ? '展开边栏' : '收起边栏'}
              >
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  onClick={() => onSidebarCollapsedChange(!sidebarCollapsed)}
                  aria-label={sidebarCollapsed ? '展开边栏' : '收起边栏'}
                >
                  {sidebarCollapsed ? (
                    <ChevronsRightIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <ChevronsLeftIcon className="size-4" aria-hidden="true" />
                  )}
                </Button>
              </RailControl>
            ) : null}
          </div>
        </nav>
      </aside>
    </TooltipProvider>
  )
}
