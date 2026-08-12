import { useMediaQuery } from '@reactuses/core'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Diamond,
  DiamondMinus,
  Pencil,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'

import WeiboLogo from '@/assets/icons/weibo.svg'
import { BellIcon } from '@/components/ui/bell'
import { BookmarkIcon } from '@/components/ui/bookmark'
import { Button, buttonVariants } from '@/components/ui/button'
import { CogIcon } from '@/components/ui/cog'
import { CompassIcon } from '@/components/ui/compass'
import { HistoryIcon } from '@/components/ui/history'
import { HomeIcon } from '@/components/ui/home'
import { MessageSquareMoreIcon } from '@/components/ui/message-square-more'
import { Separator } from '@/components/ui/separator'
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
  return cn(
    'flex w-full items-center gap-2',
    showLabel ? 'justify-start' : 'justify-center',
    showLabel && 'font-medium',
  )
}

function NavButton({
  children,
  label,
  ariaLabel,
  showLabel,
  isActive,
  onClick,
  href,
  to,
  isExternal,
  variant,
  showBadge,
  disabled,
  pressable = false,
}: {
  children: React.ReactNode
  label: React.ReactNode
  ariaLabel: string
  showLabel: boolean
  isActive?: boolean
  onClick?: () => void
  href?: string
  to?: string
  isExternal?: boolean
  variant?: React.ComponentProps<typeof Button>['variant']
  showBadge?: boolean
  disabled?: boolean
  pressable?: boolean
}) {
  const buttonVariant = variant ?? (isActive ? 'secondary' : 'ghost')
  const accessibleLabel = showBadge ? `${ariaLabel}，有未读` : ariaLabel
  const iconWrap = (icon: React.ReactNode) =>
    showBadge ? (
      <span className="relative">
        {icon}
        <span
          aria-hidden="true"
          className="bg-destructive absolute -top-1 -right-1 size-2 rounded-full"
        />
      </span>
    ) : (
      icon
    )
  const size = showLabel ? 'default' : 'icon'
  const sharedClassName = cn(
    navButtonClassName(showLabel),
    isActive && 'font-semibold',
    pressable && 'active:scale-[0.96]',
  )
  const button = href ? (
    <a
      href={href}
      target={isExternal ? '_blank' : undefined}
      rel={isExternal ? 'noopener noreferrer' : undefined}
      aria-label={showBadge || disabled || !showLabel ? accessibleLabel : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(buttonVariants({ variant: buttonVariant, size }), sharedClassName)}
      onClick={onClick}
    >
      {iconWrap(children)}
      {showLabel && <span className="min-w-0 truncate">{label}</span>}
      {showBadge && showLabel && <span className="sr-only">，有未读</span>}
    </a>
  ) : to && !disabled ? (
    <Link
      to={to}
      aria-label={showBadge || disabled || !showLabel ? accessibleLabel : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(buttonVariants({ variant: buttonVariant, size }), sharedClassName)}
    >
      {iconWrap(children)}
      {showLabel && <span className="min-w-0 truncate">{label}</span>}
      {showBadge && showLabel && <span className="sr-only">，有未读</span>}
    </Link>
  ) : (
    <Button
      type="button"
      variant={buttonVariant}
      aria-label={showBadge || disabled || !showLabel ? accessibleLabel : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={sharedClassName}
      onClick={onClick}
      size={size}
      disabled={disabled}
      static={!pressable}
    >
      {iconWrap(children)}
      {showLabel && <span className="min-w-0 truncate">{label}</span>}
      {showBadge && showLabel && <span className="sr-only">，有未读</span>}
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
      <div className="flex min-w-0 items-center justify-between gap-3">
        <span className="text-muted-foreground min-w-0 truncate text-xs font-medium">{label}</span>
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
  immersiveMode?: boolean
  onImmersiveModeChange?: (enabled: boolean) => void
}

export function ImmersiveExitRail({
  onImmersiveModeChange,
}: Pick<NavigationRailProps, 'onImmersiveModeChange'>) {
  return (
    <TooltipProvider>
      <aside className="flex h-full min-h-0 flex-col items-center px-1 py-3 md:px-2 md:py-4 xl:px-3 xl:py-5">
        <div className="mt-auto">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label="退出沉浸模式"
                onClick={() => onImmersiveModeChange?.(false)}
              >
                <DiamondMinus className="size-4" aria-hidden="true" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">退出沉浸模式</TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  )
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
  immersiveMode = false,
  onImmersiveModeChange,
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
  const isXl = useMediaQuery('(min-width: 1280px)')
  const isCollapsed = immersiveMode || !isXl || sidebarCollapsed

  const profileHref = useMemo(
    () => (currentUserUid ? `/u/${currentUserUid}` : null),
    [currentUserUid],
  )
  const favoritesHref = useMemo(
    () => (currentUserUid ? `/u/page/fav/${currentUserUid}` : null),
    [currentUserUid],
  )
  const isOwnProfileActive =
    pageKind === 'profile' &&
    Boolean(currentUserUid) &&
    Boolean(viewingProfileUserId) &&
    currentUserUid === viewingProfileUserId
  const isSavedItemsActive = pageKind === 'favorites' || pageKind === 'liked'

  const shouldPollUnread = !immersiveMode && (showNotifications || showDMs)
  const { data: unreadCounts } = useQuery({
    ...unreadNotificationsQueryOptions,
    enabled: shouldPollUnread,
  })
  const showNotificationBadge = unreadCounts ? hasNotificationBadge(unreadCounts) : false
  const showDmBadge = unreadCounts ? hasDmBadge(unreadCounts) : false

  if (immersiveMode) {
    return <ImmersiveExitRail onImmersiveModeChange={onImmersiveModeChange} />
  }

  return (
    <TooltipProvider>
      <aside
        className={cn(
          'scrollbar-none flex h-full min-h-0 flex-col overflow-y-auto px-1 py-3 md:px-2 md:py-4 xl:px-3 xl:py-5',
          isCollapsed ? 'w-10 md:w-14' : 'w-[204px]',
        )}
      >
        <div className="mb-4 flex shrink-0 justify-start">
          <Link
            to="/"
            aria-label="返回主页"
            className="focus-visible:ring-ring/50 rounded-lg opacity-80 transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:outline-none"
          >
            <img src={WeiboLogo} alt="" className="size-8 translate-y-px object-contain" />
          </Link>
        </div>

        <nav aria-label="主导航" className="flex min-h-0 flex-1 flex-col">
          <div className="flex flex-col gap-1">
            <NavButton
              label="主页"
              ariaLabel="主页"
              showLabel={!isCollapsed}
              isActive={!isOwnProfileActive && pageKind === 'home'}
              to={
                homeGroupId
                  ? `/mygroups?gid=${homeGroupId}`
                  : homeTab === 'for-you'
                    ? '/'
                    : '/mygroups'
              }
            >
              <HomeIcon aria-hidden="true" className="size-4 shrink-0" />
            </NavButton>

            {showExplore && (
              <NavButton
                label="探索"
                ariaLabel="探索"
                showLabel={!isCollapsed}
                isActive={pageKind === 'explore'}
                to="/hot/weibo/102803"
              >
                <CompassIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showFavorites && (
              <NavButton
                label="收藏"
                ariaLabel={favoritesHref ? '收藏' : '收藏，登录后可用'}
                showLabel={!isCollapsed}
                isActive={isSavedItemsActive}
                to={favoritesHref ?? undefined}
                disabled={!favoritesHref}
              >
                <BookmarkIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showHistorySetting && (
              <NavButton
                label="历史"
                ariaLabel="历史"
                showLabel={!isCollapsed}
                isActive={pageKind === 'history'}
                to="/history"
              >
                <HistoryIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showNotifications && (
              <NavButton
                label="通知"
                ariaLabel="通知"
                showLabel={!isCollapsed}
                isActive={pageKind === 'notifications'}
                showBadge={showNotificationBadge}
                to="/at/weibo"
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
                ariaLabel="私信"
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
                ariaLabel={profileHref ? '我的' : '我的，登录后可用'}
                showLabel={!isCollapsed}
                isActive={isOwnProfileActive}
                to={profileHref ?? undefined}
                disabled={!profileHref}
              >
                <UserIcon aria-hidden="true" className="size-4 shrink-0" />
              </NavButton>
            )}

            {showCompose && (
              <div className="mt-2">
                <NavButton
                  label="发微博"
                  ariaLabel="发微博"
                  showLabel={!isCollapsed}
                  onClick={onComposeOpen}
                  variant="default"
                  pressable
                >
                  <Pencil aria-hidden="true" className="size-4 shrink-0" />
                </NavButton>
              </div>
            )}
          </div>

          <div role="group" aria-label="界面控制" className="mt-auto shrink-0 pt-4">
            <Separator className="bg-border/40 mb-3" />
            <div className={cn('flex flex-col gap-3', !isCollapsed && 'gap-3.5')}>
              <RailControl label="设置" isCollapsed={isCollapsed}>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="设置"
                  onClick={onSettingsOpen}
                >
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

              <RailControl label="沉浸模式" isCollapsed={isCollapsed}>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="切换沉浸模式"
                  aria-pressed={immersiveMode}
                  onClick={() => onImmersiveModeChange?.(!immersiveMode)}
                >
                  <Diamond className="size-4" aria-hidden="true" />
                </Button>
              </RailControl>

              {isXl ? (
                <RailControl
                  label={sidebarCollapsed ? '展开' : '收起'}
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
          </div>
        </nav>
      </aside>
    </TooltipProvider>
  )
}
