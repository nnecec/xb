import {
  Bell,
  Bookmark,
  Compass,
  Copy,
  Download,
  GripVertical,
  Heart,
  History,
  Home,
  Image,
  LinkIcon,
  MessageCircle,
  MessageSquare,
  PanelLeft,
  PanelRight,
  Pencil,
  Repeat2,
  User,
} from 'lucide-react'
import { Reorder } from 'motion/react'
import React, { useMemo } from 'react'

import darkModeImageDimJpeg from '@/assets/images/dark-mode-image-dim.jpeg'
import collapseReplyChain from '@/assets/images/quotechains-collapsible.jpeg'
import quoteChainsJpeg from '@/assets/images/quotechains.jpeg'
import { TreeView, type TreeDataItem } from '@/components/tree-view'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  CUSTOM_CONTENT_WIDTH_MAX,
  CUSTOM_CONTENT_WIDTH_MIN,
  CUSTOM_CONTENT_WIDTH_STEP,
  DEFAULT_APP_SETTINGS,
  FEED_TOOLBAR_BUTTON_IDS,
  WEIBO_CARD_MULTI_MEDIA_GRID_LIMIT_OPTIONS,
  WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MAX,
  WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MIN,
  WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_STEP,
  WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MAX,
  WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MIN,
  WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_STEP,
  WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MAX,
  WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MIN,
  WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_STEP,
  type AppSettings,
  type ContentDensity,
  type ContentDisplay,
  type ContentWidth,
  type FeedInteractionMode,
  type FeedPrimaryActionId,
  type FeedToolbarButtonId,
  type HomeTab,
  type MotionPreference,
  type WeiboCardMultiMediaGridLimit,
  type WeiboCardMultiMediaLayout,
} from '@/lib/app-settings'
import { type AppSettingsStoreState, useAppSettings, useShallow } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'

import { Field, IllustrationPlaceholder, OptionPills, StackedField } from './settings-dialog-ui'

const APPEARANCE_TABS = [
  { id: 'app', label: '应用整体' },
  { id: 'feed', label: '信息流' },
  { id: 'weibo', label: '微博卡片' },
  { id: 'comment', label: '评论卡片' },
] as const

const PAGE_VISIBILITY_KEYS = {
  explore: 'showExplore',
  favorites: 'showFavorites',
  history: 'showHistory',
  notifications: 'showNotifications',
  dms: 'showDMs',
  profile: 'showProfile',
  compose: 'showCompose',
  'right-rail': 'showRightRail',
  'hot-search': 'showHotSearchCard',
  'super-topic': 'showFollowedSuperTopicsCard',
} as const satisfies Record<string, keyof AppSettings>

const APP_SETTING_KEYS = [
  'contentWidth',
  'customContentWidth',
  'showExplore',
  'showFavorites',
  'showHistory',
  'showNotifications',
  'showDMs',
  'showProfile',
  'showCompose',
  'showRightRail',
  'showHotSearchCard',
  'showFollowedSuperTopicsCard',
  'motionPreference',
  'darkModeImageDim',
] as const satisfies readonly (keyof AppSettings)[]

const FEED_SETTING_KEYS = [
  'firstLoadRedirect',
  'feedDensity',
  'autoLoadLongText',
] as const satisfies readonly (keyof AppSettings)[]

const WEIBO_CARD_SETTING_KEYS = [
  'weiboCardShowAvatar',
  'weiboCardShowTimestamp',
  'weiboCardShowPublishInfo',
  'weiboCardShowTitleBadge',
  'weiboCardShowInteractionCounts',
  'weiboCardMediaDisplay',
  'weiboCardSingleImageMaxWidth',
  'weiboCardSingleVideoMaxWidth',
  'weiboCardMultiMediaLayout',
  'weiboCardMultiMediaGridLimit',
  'weiboCardMultiMediaGridMaxWidth',
  'weiboCardMultiMediaStripHeight',
  'rememberPlaybackRate',
  'playbackRate',
  'feedInteractionMode',
  'feedPrimaryActionOrder',
  'feedToolbarButtonIds',
  'renderReplyChainEnabled',
  'collapseRepliesEnabled',
] as const satisfies readonly (keyof AppSettings)[]

const COMMENT_CARD_SETTING_KEYS = [
  'commentDensity',
  'commentCardShowAvatar',
  'commentCardShowTimestamp',
  'commentCardShowPublishInfo',
  'commentCardShowAuthorBadge',
  'commentCardImageDisplay',
  'commentCardShowLikeCount',
  'commentCardShowThreadLine',
  'commentCardCollapseRepliesByDefault',
] as const satisfies readonly (keyof AppSettings)[]

const PRIMARY_ACTION_OPTIONS: Array<{
  id: FeedPrimaryActionId
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: 'comment', label: '评论', icon: MessageCircle },
  { id: 'repost', label: '转发', icon: Repeat2 },
  { id: 'like', label: '点赞', icon: Heart },
]

const TOOLBAR_BUTTON_OPTIONS: Array<{
  id: FeedToolbarButtonId
  label: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { id: 'favorite', label: '收藏', icon: Bookmark },
  { id: 'copy-link', label: '复制链接', icon: LinkIcon },
  { id: 'copy-text', label: '复制正文', icon: Copy },
  { id: 'download-media', label: '批量下载', icon: Download },
  { id: 'gen-image', label: '生图', icon: Image },
]

const FEED_INTERACTION_OPTIONS: Array<{
  value: FeedInteractionMode
  label: string
  description: string
}> = [
  {
    value: 'x',
    label: 'X 风格',
    description: '点击卡片进入详情，评论按钮弹出评论框',
  },
  {
    value: 'weibo',
    label: '微博风格',
    description: '评论按钮展开精选评论，点击查看更多进入详情',
  },
]

function defaultsFor(keys: readonly (keyof AppSettings)[]): Partial<AppSettings> {
  return Object.fromEntries(
    keys.map((key) => [key, DEFAULT_APP_SETTINGS[key]]),
  ) as Partial<AppSettings>
}

function SettingsPanel({ children }: { children: React.ReactNode }) {
  return <div className="divide-border/40 flex flex-col divide-y px-6 py-5">{children}</div>
}

function ResetSectionButton({ label, onReset }: { label: string; onReset: () => void }) {
  return (
    <div className="flex justify-end pt-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            恢复默认设置
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>恢复{label}默认设置？</AlertDialogTitle>
            <AlertDialogDescription>
              只会重置“{label}”中的设置，不影响其他分类、主题或字体。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={onReset}>恢复默认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function DisplayModeField({
  label,
  description,
  value,
  onChange,
}: {
  label: string
  description: string
  value: ContentDisplay
  onChange: (value: ContentDisplay) => void
}) {
  return (
    <Field label={label} description={description}>
      <OptionPills
        value={value}
        options={[
          { value: 'expanded', label: '默认展开' },
          { value: 'collapsed', label: '默认折叠' },
        ]}
        onChange={onChange}
      />
    </Field>
  )
}

export function SettingsAppearanceSection({
  scrollContainerRef,
}: {
  scrollContainerRef: React.RefObject<HTMLElement | null>
}) {
  const settings = useAppSettings(useShallow((state) => state))

  function handleTabChange() {
    if (typeof scrollContainerRef.current?.scrollTo === 'function') {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }

  return (
    <Tabs defaultValue="app" onValueChange={handleTabChange} className="gap-0">
      <div className="border-border/40 bg-background/90 sticky top-0 z-10 border-b px-6 py-2 backdrop-blur-sm">
        <TabsList variant="line" className="grid h-9 w-full grid-cols-4">
          {APPEARANCE_TABS.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="px-1 text-xs">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="app">
        <AppSettingsPanel settings={settings} />
      </TabsContent>
      <TabsContent value="feed">
        <FeedSettingsPanel settings={settings} />
      </TabsContent>
      <TabsContent value="weibo">
        <WeiboCardSettingsPanel settings={settings} />
      </TabsContent>
      <TabsContent value="comment">
        <CommentCardSettingsPanel settings={settings} />
      </TabsContent>
    </Tabs>
  )
}

function AppSettingsPanel({ settings }: { settings: AppSettingsStoreState }) {
  const pageElementTreeData = useMemo<TreeDataItem[]>(
    () => [
      {
        id: 'left-rail',
        name: '左侧边栏',
        icon: PanelLeft,
        disabled: true,
        children: [
          { id: 'home', name: '主页', icon: Home, disabled: true },
          { id: 'explore', name: '探索', icon: Compass },
          { id: 'favorites', name: '收藏', icon: Bookmark },
          { id: 'history', name: '历史', icon: History },
          { id: 'notifications', name: '通知', icon: Bell },
          { id: 'dms', name: '私信', icon: MessageSquare },
          { id: 'profile', name: '我的', icon: User },
          { id: 'compose', name: '发微博', icon: Pencil },
        ],
      },
      {
        id: 'right-rail',
        name: '右侧边栏',
        icon: PanelRight,
        children: [
          { id: 'hot-search', name: '热搜卡片' },
          { id: 'super-topic', name: '超话卡片' },
        ],
      },
    ],
    [],
  )

  const pageVisibility = {
    showExplore: settings.showExplore,
    showFavorites: settings.showFavorites,
    showHistory: settings.showHistory,
    showNotifications: settings.showNotifications,
    showDMs: settings.showDMs,
    showProfile: settings.showProfile,
    showCompose: settings.showCompose,
    showRightRail: settings.showRightRail,
    showHotSearchCard: settings.showHotSearchCard,
    showFollowedSuperTopicsCard: settings.showFollowedSuperTopicsCard,
  }

  function getSwitchState(id: string): boolean {
    if (id === 'home') return true
    const key = PAGE_VISIBILITY_KEYS[id as keyof typeof PAGE_VISIBILITY_KEYS]
    return key ? pageVisibility[key] : true
  }

  function renderTreeItem({ item, isLeaf }: { item: TreeDataItem; isLeaf: boolean }) {
    const isParent = !isLeaf && item.id !== 'home'
    const isRightRailChild = item.id === 'hot-search' || item.id === 'super-topic'
    const disabledByParent = isRightRailChild && !settings.showRightRail

    return (
      <div className="flex flex-1 items-center justify-between">
        <span className="flex items-center gap-2 text-sm">
          {item.icon ? <item.icon className="size-4 shrink-0" /> : null}
          {item.name}
        </span>
        {!item.disabled ? (
          <div onClick={(event) => event.stopPropagation()}>
            <Switch
              checked={getSwitchState(item.id)}
              disabled={isParent ? false : disabledByParent}
              onCheckedChange={(checked) => {
                const key = PAGE_VISIBILITY_KEYS[item.id as keyof typeof PAGE_VISIBILITY_KEYS]
                if (key) void settings.updateSettings({ [key]: checked })
              }}
            />
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <SettingsPanel>
      <>
        <StackedField label="内容宽度" description="调整应用内容区域在大屏幕上的宽度">
          <OptionPills
            value={settings.contentWidth}
            options={[
              { value: 'narrower', label: '更窄' },
              { value: 'narrow', label: '窄' },
              { value: 'standard', label: '标准' },
              { value: 'wide', label: '宽' },
              { value: 'wider', label: '更宽' },
              { value: 'custom', label: '自定义' },
            ]}
            onChange={(value) =>
              void settings.updateSettings({ contentWidth: value as ContentWidth })
            }
          />
          {settings.contentWidth === 'custom' ? (
            <div className="flex items-center gap-3 pt-1">
              <Slider
                min={CUSTOM_CONTENT_WIDTH_MIN}
                max={CUSTOM_CONTENT_WIDTH_MAX}
                step={CUSTOM_CONTENT_WIDTH_STEP}
                value={[settings.customContentWidth]}
                aria-label="自定义内容宽度"
                onValueChange={([value]) => {
                  if (value !== undefined)
                    void settings.updateSettings({ customContentWidth: value })
                }}
              />
              <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
                {settings.customContentWidth}px
              </output>
            </div>
          ) : null}
        </StackedField>
        <Field label="动态效果" description="控制 xb 动画是否跟随系统的减少动态效果设置">
          <OptionPills
            value={settings.motionPreference}
            options={[
              { value: 'system', label: '跟随系统' },
              { value: 'full', label: '完整' },
              { value: 'reduced', label: '减少' },
            ]}
            onChange={(value) =>
              void settings.updateSettings({ motionPreference: value as MotionPreference })
            }
          />
        </Field>
        <Field label="暗色模式降低图片亮度" description="降低卡片缩略图亮度，打开原图后恢复正常">
          <Switch
            checked={settings.darkModeImageDim}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ darkModeImageDim: checked })
            }
          />
        </Field>
        <IllustrationPlaceholder>
          <img
            src={darkModeImageDimJpeg}
            alt="暗色模式降低图片亮度效果"
            className="h-auto w-full"
          />
        </IllustrationPlaceholder>
      </>

      <>
        <StackedField label="页面可见性">
          <TreeView
            data={pageElementTreeData}
            className="max-h-[220px] overflow-y-auto"
            renderItem={renderTreeItem}
          />
        </StackedField>
      </>

      <ResetSectionButton
        label="应用整体"
        onReset={() => void settings.updateSettings(defaultsFor(APP_SETTING_KEYS))}
      />
    </SettingsPanel>
  )
}

function FeedSettingsPanel({ settings }: { settings: AppSettingsStoreState }) {
  return (
    <SettingsPanel>
      <>
        <Field label="信息流密度" description="只影响列表中的微博卡片，详情页保持标准密度">
          <OptionPills
            value={settings.feedDensity}
            options={[
              { value: 'relaxed', label: '宽松' },
              { value: 'standard', label: '标准' },
              { value: 'compact', label: '紧凑' },
            ]}
            onChange={(value) =>
              void settings.updateSettings({ feedDensity: value as ContentDensity })
            }
          />
        </Field>
        <Field label="自动查看全文" description="长微博进入视口时自动加载完整内容">
          <Switch
            checked={settings.autoLoadLongText}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ autoLoadLongText: checked })
            }
          />
        </Field>
      </>

      <>
        <Field label="首页默认时间线">
          <Select
            value={settings.firstLoadRedirect}
            onValueChange={(value) =>
              void settings.updateSettings({ firstLoadRedirect: value as HomeTab })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="for-you">推荐</SelectItem>
                <SelectItem value="following">我关注的</SelectItem>
                <SelectItem value="special-follow">特别关注</SelectItem>
                <SelectItem value="friend-circle">朋友圈</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Field>
      </>

      <ResetSectionButton
        label="信息流"
        onReset={() => void settings.updateSettings(defaultsFor(FEED_SETTING_KEYS))}
      />
    </SettingsPanel>
  )
}

function WeiboCardSettingsPanel({ settings }: { settings: AppSettingsStoreState }) {
  function handleToolbarButtonToggle(id: FeedToolbarButtonId, checked: boolean) {
    const selected = new Set(settings.feedToolbarButtonIds)
    if (checked) selected.add(id)
    else selected.delete(id)
    void settings.updateSettings({
      feedToolbarButtonIds: FEED_TOOLBAR_BUTTON_IDS.filter((buttonId) => selected.has(buttonId)),
    })
  }

  return (
    <SettingsPanel>
      <>
        <Field label="显示头像">
          <Switch
            checked={settings.weiboCardShowAvatar}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ weiboCardShowAvatar: checked })
            }
          />
        </Field>
        <Field label="显示发布时间">
          <Switch
            checked={settings.weiboCardShowTimestamp}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ weiboCardShowTimestamp: checked })
            }
          />
        </Field>
        <Field label="显示发布信息" description="控制作者下方的发送设备与归属地整行">
          <Switch
            checked={settings.weiboCardShowPublishInfo}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ weiboCardShowPublishInfo: checked })
            }
          />
        </Field>
        <Field label="显示标题徽章">
          <Switch
            checked={settings.weiboCardShowTitleBadge}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ weiboCardShowTitleBadge: checked })
            }
          />
        </Field>
      </>

      <>
        <DisplayModeField
          label="媒体区域"
          description="统一控制图片、视频、直播、回放、音频与播客的默认展示状态"
          value={settings.weiboCardMediaDisplay}
          onChange={(value) => void settings.updateSettings({ weiboCardMediaDisplay: value })}
        />
        <StackedField label="单图最大宽度" description="实际宽度不会超过中间列可用宽度">
          <div className="flex items-center gap-3 pt-1">
            <Slider
              min={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MIN}
              max={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MAX}
              step={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_STEP}
              value={[settings.weiboCardSingleImageMaxWidth]}
              aria-label="单图最大宽度"
              onValueChange={([value]) => {
                if (value !== undefined)
                  void settings.updateSettings({ weiboCardSingleImageMaxWidth: value })
              }}
            />
            <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
              {settings.weiboCardSingleImageMaxWidth}px
            </output>
          </div>
        </StackedField>
        <StackedField label="单视频最大宽度" description="普通视频使用，直播与回放保持独立布局">
          <div className="flex items-center gap-3 pt-1">
            <Slider
              min={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MIN}
              max={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MAX}
              step={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_STEP}
              value={[settings.weiboCardSingleVideoMaxWidth]}
              aria-label="单视频最大宽度"
              onValueChange={([value]) => {
                if (value !== undefined)
                  void settings.updateSettings({ weiboCardSingleVideoMaxWidth: value })
              }}
            />
            <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
              {settings.weiboCardSingleVideoMaxWidth}px
            </output>
          </div>
        </StackedField>
        <Field label="多图展示" description="只影响微博主体中的多图片或图视频混合媒体">
          <OptionPills
            value={settings.weiboCardMultiMediaLayout}
            options={[
              { value: 'grid', label: '宫格' },
              { value: 'horizontal', label: '画廊' },
            ]}
            onChange={(value) =>
              void settings.updateSettings({
                weiboCardMultiMediaLayout: value as WeiboCardMultiMediaLayout,
              })
            }
          />
        </Field>
        {settings.weiboCardMultiMediaLayout === 'grid' ? (
          <>
            <Field label="最多展示" description="更多媒体收进最后一格的 +N 提示">
              <OptionPills
                value={String(settings.weiboCardMultiMediaGridLimit)}
                options={WEIBO_CARD_MULTI_MEDIA_GRID_LIMIT_OPTIONS.map((value) => ({
                  value: String(value),
                  label: `${value} 张`,
                }))}
                onChange={(value) =>
                  void settings.updateSettings({
                    weiboCardMultiMediaGridLimit: Number(value) as WeiboCardMultiMediaGridLimit,
                  })
                }
              />
            </Field>
            <StackedField label="宫格最大宽度" description="小屏幕仍会自动收缩到可用宽度">
              <div className="flex items-center gap-3 pt-1">
                <Slider
                  min={WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MIN}
                  max={WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MAX}
                  step={WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_STEP}
                  value={[settings.weiboCardMultiMediaGridMaxWidth]}
                  aria-label="宫格最大宽度"
                  onValueChange={([value]) => {
                    if (value !== undefined)
                      void settings.updateSettings({ weiboCardMultiMediaGridMaxWidth: value })
                  }}
                />
                <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
                  {settings.weiboCardMultiMediaGridMaxWidth}px
                </output>
              </div>
            </StackedField>
          </>
        ) : (
          <StackedField label="画廊高度" description="图片宽度会按原始比例自动调整">
            <div className="flex items-center gap-3 pt-1">
              <Slider
                min={WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MIN}
                max={WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MAX}
                step={WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_STEP}
                value={[settings.weiboCardMultiMediaStripHeight]}
                aria-label="画廊高度"
                onValueChange={([value]) => {
                  if (value !== undefined)
                    void settings.updateSettings({ weiboCardMultiMediaStripHeight: value })
                }}
              />
              <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
                {settings.weiboCardMultiMediaStripHeight}px
              </output>
            </div>
          </StackedField>
        )}
        <Field label="视频倍速记忆" description="使用最近一次手动设置的倍速作为视频默认倍速">
          <Switch
            checked={settings.rememberPlaybackRate}
            onCheckedChange={(checked) =>
              void settings.updateSettings({
                rememberPlaybackRate: checked,
                ...(checked ? {} : { playbackRate: 1 }),
              })
            }
          />
        </Field>
      </>

      <>
        <Field label="转发链样式" description='将 "//@用户名:" 格式显示为引用卡片'>
          <Switch
            checked={settings.renderReplyChainEnabled}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ renderReplyChainEnabled: checked })
            }
          />
        </Field>
        <IllustrationPlaceholder>
          <img src={quoteChainsJpeg} alt="转发链样式效果" className="h-auto w-full" />
        </IllustrationPlaceholder>
        {settings.renderReplyChainEnabled ? (
          <>
            <Field label="折叠转发链" description="转发链超过 2 条时折叠中间内容">
              <Switch
                checked={settings.collapseRepliesEnabled}
                onCheckedChange={(checked) =>
                  void settings.updateSettings({ collapseRepliesEnabled: checked })
                }
              />
            </Field>
            <IllustrationPlaceholder>
              <img src={collapseReplyChain} alt="折叠转发链效果" className="h-auto w-full" />
            </IllustrationPlaceholder>
          </>
        ) : null}
      </>

      <>
        <StackedField label="微博卡片行为" description="选择点击微博卡片和评论按钮后的打开方式">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
            {FEED_INTERACTION_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={settings.feedInteractionMode === option.value}
                onClick={() => void settings.updateSettings({ feedInteractionMode: option.value })}
                className={cn(
                  'border-border bg-background hover:bg-accent/30 rounded-lg border p-3 text-left transition-[box-shadow,border-color]',
                  settings.feedInteractionMode === option.value &&
                    'border-primary ring-primary/30 ring-2',
                )}
              >
                <p className="text-sm font-medium">{option.label}</p>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  {option.description}
                </p>
              </button>
            ))}
          </div>
        </StackedField>
        <Field label="显示互动数字" description="保留评论、转发和点赞按钮，只隐藏数量">
          <Switch
            checked={settings.weiboCardShowInteractionCounts}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ weiboCardShowInteractionCounts: checked })
            }
          />
        </Field>
        <StackedField label="微博操作顺序" description="拖动调整评论、转发、点赞的位置">
          <Reorder.Group
            axis="x"
            values={settings.feedPrimaryActionOrder}
            onReorder={(value) => void settings.updateSettings({ feedPrimaryActionOrder: value })}
            className="grid grid-cols-3 gap-2"
          >
            {settings.feedPrimaryActionOrder.map((id) => {
              const option = PRIMARY_ACTION_OPTIONS.find((item) => item.id === id)
              if (!option) return null
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  className="border-border bg-background flex cursor-grab items-center justify-between rounded-md border px-2.5 py-2 text-sm active:cursor-grabbing"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <option.icon className="size-4 shrink-0" />
                    <span className="truncate">{option.label}</span>
                  </span>
                  <GripVertical className="text-muted-foreground size-4 shrink-0" />
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        </StackedField>
        <StackedField label="固定到操作栏" description="未勾选的工具仍可从更多菜单使用">
          <div className="grid grid-cols-2 gap-2">
            {TOOLBAR_BUTTON_OPTIONS.map((option) => (
              <label
                key={option.id}
                className="border-border hover:bg-accent/50 flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-2 text-sm"
              >
                <Checkbox
                  checked={settings.feedToolbarButtonIds.includes(option.id)}
                  onCheckedChange={(checked) =>
                    handleToolbarButtonToggle(option.id, checked === true)
                  }
                />
                <option.icon className="size-4 shrink-0" />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </StackedField>
      </>

      <ResetSectionButton
        label="微博卡片"
        onReset={() => void settings.updateSettings(defaultsFor(WEIBO_CARD_SETTING_KEYS))}
      />
    </SettingsPanel>
  )
}

function CommentCardSettingsPanel({ settings }: { settings: AppSettingsStoreState }) {
  return (
    <SettingsPanel>
      <>
        <Field label="评论密度">
          <OptionPills
            value={settings.commentDensity}
            options={[
              { value: 'relaxed', label: '宽松' },
              { value: 'standard', label: '标准' },
              { value: 'compact', label: '紧凑' },
            ]}
            onChange={(value) =>
              void settings.updateSettings({ commentDensity: value as ContentDensity })
            }
          />
        </Field>
        <Field label="显示头像">
          <Switch
            checked={settings.commentCardShowAvatar}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ commentCardShowAvatar: checked })
            }
          />
        </Field>
        <Field label="显示发布时间">
          <Switch
            checked={settings.commentCardShowTimestamp}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ commentCardShowTimestamp: checked })
            }
          />
        </Field>
        <Field label="显示发布信息" description="评论仅展示可用的发送设备信息，默认关闭">
          <Switch
            checked={settings.commentCardShowPublishInfo}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ commentCardShowPublishInfo: checked })
            }
          />
        </Field>
        <Field label="显示博主徽章">
          <Switch
            checked={settings.commentCardShowAuthorBadge}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ commentCardShowAuthorBadge: checked })
            }
          />
        </Field>
      </>

      <>
        <DisplayModeField
          label="图片内容"
          description="默认折叠时仍可临时展开当前评论图片"
          value={settings.commentCardImageDisplay}
          onChange={(value) => void settings.updateSettings({ commentCardImageDisplay: value })}
        />
        <Field label="显示点赞数字" description="点赞按钮始终保留">
          <Switch
            checked={settings.commentCardShowLikeCount}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ commentCardShowLikeCount: checked })
            }
          />
        </Field>
        <Field label="显示回复线程引导线">
          <Switch
            checked={settings.commentCardShowThreadLine}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ commentCardShowThreadLine: checked })
            }
          />
        </Field>
        <Field label="默认折叠回复" description="顶层评论照常显示，其下回复折叠为查看入口">
          <Switch
            checked={settings.commentCardCollapseRepliesByDefault}
            onCheckedChange={(checked) =>
              void settings.updateSettings({ commentCardCollapseRepliesByDefault: checked })
            }
          />
        </Field>
      </>

      <ResetSectionButton
        label="评论卡片"
        onReset={() => void settings.updateSettings(defaultsFor(COMMENT_CARD_SETTING_KEYS))}
      />
    </SettingsPanel>
  )
}
