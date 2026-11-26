import { useMediaQuery } from '@reactuses/core'
import { useQuery } from '@tanstack/react-query'
import { cn } from 'cn'
import {
  ArrowUpRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  Columns3,
  Pencil,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { UserIcon } from '@/components/ui/user'
import { ZapOffIcon } from '@/components/ui/zap-off'
import type { AppTheme } from '@/lib/app-settings'
import { useAppSettings, useShallow } from '@/lib/app-settings-store'
import { ThemeModeToggle } from '@/lib/weibo/components/theme-mode-toggle'
import {
  hasDmBadge,
  hasNotificationBadge,
  unreadNotificationsQueryOptions,
} from '@/lib/weibo/data/weibo-data'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'

const railEase = [0.23, 1, 0.32, 1] as const

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
  const size = showLabel ? 'default' : 'icon'
  const sharedClassName = cn(
    showBadge && 'relative',
    showLabel && 'w-full justify-start font-medium',
    isActive && 'font-semibold',
    pressable && 'active:scale-[0.96]',
  )
  const badge = showBadge ? (
    <span
      aria-hidden="true"
      className="bg-destructive absolute top-1 right-1 size-2 rounded-full"
    />
  ) : null
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
      {children}
      {showLabel ? <NavLabel label={label} /> : null}
      {badge}
      {showBadge && showLabel && <span className="sr-only">，有未读</span>}
    </a>
  ) : to && !disabled ? (
    <Link
      to={to}
      aria-label={showBadge || disabled || !showLabel ? accessibleLabel : undefined}
      aria-current={isActive ? 'page' : undefined}
      className={cn(buttonVariants({ variant: buttonVariant, size }), sharedClassName)}
      onClick={onClick}
    >
      {children}
      {showLabel ? <NavLabel label={label} /> : null}
      {badge}
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
      {children}
      {showLabel ? <NavLabel label={label} /> : null}
      {badge}
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

function NavLabel({ label }: { label: React.ReactNode }) {
  const shouldReduceMotion = useReducedMotion()

  return (
    <motion.span
      animate={{ opacity: 1 }}
      className="min-w-0 flex-1 truncate text-left"
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.16, ease: railEase }}
    >
      {label}
    </motion.span>
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
  const shouldReduceMotion = useReducedMotion()
  const row = (
    <div
      className={cn(
        'relative flex h-8 items-center',
        isCollapsed ? 'justify-center' : 'justify-end',
      )}
    >
      <motion.span
        aria-hidden={isCollapsed}
        animate={{ opacity: isCollapsed ? 0 : 1 }}
        className="text-muted-foreground pointer-events-none absolute inset-y-0 right-11 left-0 flex items-center truncate text-xs font-medium"
        initial={false}
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: isCollapsed ? 0.1 : 0.16, ease: railEase, delay: isCollapsed ? 0 : 0.06 }
        }
      >
        {label}
      </motion.span>
      {children}
    </div>
  )

  if (!isCollapsed) return row

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{row}</div>
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
  onColumnPickerOpen?: () => void
  onPrimaryNavigate?: () => void
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
  onColumnPickerOpen,
  onPrimaryNavigate,
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
      homeTab: state.home.homeTab,
      homeGroupId: state.home.homeGroupId,
      showExplore: state.navigation.showExplore,
      showFavorites: state.navigation.showFavorites,
      showHistory: state.navigation.showHistory,
      showNotifications: state.navigation.showNotifications,
      showDMs: state.navigation.showDMs,
      showProfile: state.navigation.showProfile,
      showCompose: state.navigation.showCompose,
      sidebarCollapsed: state.navigation.sidebarCollapsed,
    })),
  )
  const currentUserUid = useMemo(() => getCurrentUserUid(), [])
  const isXl = useMediaQuery('(min-width: 1280px)')
  const isCollapsed = !isXl || sidebarCollapsed
  const shouldReduceMotion = useReducedMotion()

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

  const shouldPollUnread = showNotifications || showDMs
  const { data: unreadCounts } = useQuery({
    ...unreadNotificationsQueryOptions,
    enabled: shouldPollUnread,
  })
  const showNotificationBadge = unreadCounts ? hasNotificationBadge(unreadCounts) : false
  const showDmBadge = unreadCounts ? hasDmBadge(unreadCounts) : false

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={isXl && !shouldReduceMotion ? { width: isCollapsed ? 56 : 204 } : undefined}
        transition={{ duration: 0.24, ease: railEase }}
        className={cn(
          'scrollbar-none flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-background/80 py-3 backdrop-blur-[2px] md:py-4 xl:py-5',
          isCollapsed && 'items-center',
          isXl ? 'px-3' : isCollapsed ? 'w-10 px-1 md:w-14' : 'w-[204px] px-3',
        )}
        style={isXl ? { width: isCollapsed ? 56 : 204 } : undefined}
      >
        <div className="mb-4 flex shrink-0 justify-start">
          <Link
            to="/"
            aria-label="返回主页"
            className="focus-visible:ring-ring/50 rounded-lg opacity-80 transition-opacity duration-150 ease-out hover:opacity-100 focus-visible:opacity-100 focus-visible:ring-3 focus-visible:outline-none"
            onClick={onPrimaryNavigate}
          >
            <img src={WeiboLogo} alt="" className="size-8 translate-y-px object-contain" />
          </Link>
        </div>

        <nav
          aria-label="主导航"
          className={cn('flex min-h-0 flex-1 flex-col', isCollapsed && 'w-full items-center')}
        >
          <div className={cn('flex flex-col gap-1', isCollapsed && 'items-center')}>
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
              onClick={onPrimaryNavigate}
            >
              <HomeIcon aria-hidden="true" data-icon={isCollapsed ? undefined : 'inline-start'} />
            </NavButton>

            {showExplore && (
              <NavButton
                label="探索"
                ariaLabel="探索"
                showLabel={!isCollapsed}
                isActive={pageKind === 'explore'}
                to="/hot/weibo/102803"
                onClick={onPrimaryNavigate}
              >
                <CompassIcon
                  aria-hidden="true"
                  data-icon={isCollapsed ? undefined : 'inline-start'}
                />
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
                onClick={onPrimaryNavigate}
              >
                <BookmarkIcon
                  aria-hidden="true"
                  data-icon={isCollapsed ? undefined : 'inline-start'}
                />
              </NavButton>
            )}

            {showHistorySetting && (
              <NavButton
                label="历史"
                ariaLabel="历史"
                showLabel={!isCollapsed}
                isActive={pageKind === 'history'}
                to="/history"
                onClick={onPrimaryNavigate}
              >
                <HistoryIcon
                  aria-hidden="true"
                  data-icon={isCollapsed ? undefined : 'inline-start'}
                />
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
                onClick={onPrimaryNavigate}
              >
                <BellIcon aria-hidden="true" data-icon={isCollapsed ? undefined : 'inline-start'} />
              </NavButton>
            )}

            {showDMs && (
              <NavButton
                label={
                  <span className="flex items-center gap-1">
                    私信
                    <ArrowUpRightIcon className="size-[1em]" />
                  </span>
                }
                ariaLabel="私信"
                showLabel={!isCollapsed}
                href="https://api.weibo.com/chat"
                isExternal
                showBadge={showDmBadge}
              >
                <MessageSquareMoreIcon
                  aria-hidden="true"
                  data-icon={isCollapsed ? undefined : 'inline-start'}
                />
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
                onClick={onPrimaryNavigate}
              >
                <UserIcon aria-hidden="true" data-icon={isCollapsed ? undefined : 'inline-start'} />
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
                  <Pencil aria-hidden="true" data-icon={isCollapsed ? undefined : 'inline-start'} />
                </NavButton>
              </div>
            )}
          </div>

          <div
            role="group"
            aria-label="界面控制"
            className={cn('mt-auto shrink-0 pt-4', isCollapsed && 'flex w-full justify-center')}
          >
            <div className={cn('flex flex-col gap-3', isCollapsed && 'items-center')}>
              {onColumnPickerOpen ? (
                <RailControl label="列管理" isCollapsed={isCollapsed}>
                  <Button
                    type="button"
                    size="icon"
                    variant="secondary"
                    aria-label="列管理"
                    onClick={onColumnPickerOpen}
                  >
                    <Columns3 aria-hidden="true" />
                  </Button>
                </RailControl>
              ) : null}

              <RailControl label="设置" isCollapsed={isCollapsed}>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  aria-label="设置"
                  onClick={onSettingsOpen}
                >
                  <CogIcon aria-hidden="true" />
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
                  <ZapOffIcon aria-hidden="true" />
                </Button>
              </RailControl>

              <RailControl label="深色模式" isCollapsed={isCollapsed}>
                <ThemeModeToggle value={theme} onChange={onThemeChange} />
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
                      <ChevronsRightIcon aria-hidden="true" />
                    ) : (
                      <ChevronsLeftIcon aria-hidden="true" />
                    )}
                  </Button>
                </RailControl>
              ) : null}
            </div>
          </div>
        </nav>
      </motion.aside>
    </TooltipProvider>
  )
}
