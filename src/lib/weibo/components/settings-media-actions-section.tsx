import {
  Bookmark,
  Copy,
  Download,
  GripVertical,
  Heart,
  Image,
  LinkIcon,
  MessageCircle,
  Repeat2,
} from 'lucide-react'
import { Reorder } from 'motion/react'

import { Checkbox } from '@/components/ui/checkbox'
import { FieldLegend, FieldSet } from '@/components/ui/field'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
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
import {
  FEED_TOOLBAR_BUTTON_IDS,
  WEIBO_CARD_MEDIA_COLLAPSE_TYPES,
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
  type FeedInteractionMode,
  type FeedPrimaryActionId,
  type FeedToolbarButtonId,
  type WeiboCardMediaCollapseType,
  type WeiboCardMultiMediaGridLimit,
  type WeiboCardMultiMediaLayout,
} from '@/lib/app-settings'
import { type AppSettingsStoreState, useAppSettings, useShallow } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'

import {
  defaultsFor,
  Field,
  FineTuning,
  OptionPills,
  ResetSectionButton,
  SettingsPanel,
  StackedField,
} from './settings-dialog-ui'

const MEDIA_SETTING_KEYS = [
  'weiboCardCollapsedMediaTypes',
  'weiboCardSingleImageMaxWidth',
  'weiboCardSingleVideoMaxWidth',
  'weiboCardMultiMediaLayout',
  'weiboCardMultiMediaGridLimit',
  'weiboCardMultiMediaGridMaxWidth',
  'weiboCardMultiMediaStripHeight',
  'rememberPlaybackRate',
  'playbackRate',
] as const satisfies readonly (keyof AppSettings)[]

const ACTION_SETTING_KEYS = [
  'feedInteractionMode',
  'weiboCardShowInteractionCounts',
  'feedPrimaryActionOrder',
  'feedToolbarButtonIds',
] as const satisfies readonly (keyof AppSettings)[]

const MEDIA_COLLAPSE_OPTIONS: Array<{
  id: WeiboCardMediaCollapseType
  label: string
}> = [
  { id: 'image', label: '单一图片' },
  { id: 'video', label: '单一视频' },
  { id: 'multiple', label: '混合多图/视频' },
  { id: 'live', label: '直播' },
  { id: 'audio', label: '音频' },
]

const INTERACTION_OPTIONS: Array<{
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

export function SettingsMediaSection({
  updateSettings,
}: {
  updateSettings: AppSettingsStoreState['updateSettings']
}) {
  const settings = useAppSettings(useShallow((state) => state))

  function handleMediaCollapseTypeToggle(type: WeiboCardMediaCollapseType, checked: boolean) {
    const selected = new Set(settings.weiboCardCollapsedMediaTypes)
    if (checked) selected.add(type)
    else selected.delete(type)
    void updateSettings({
      weiboCardCollapsedMediaTypes: WEIBO_CARD_MEDIA_COLLAPSE_TYPES.filter((id) =>
        selected.has(id),
      ),
    })
  }

  return (
    <SettingsPanel>
      <FieldSet className="border-b pb-4">
        <FieldLegend>默认折叠的媒体</FieldLegend>
        <p className="text-muted-foreground text-xs leading-relaxed">
          仅影响微博卡片，点击占位仍可显示媒体。
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {MEDIA_COLLAPSE_OPTIONS.map((option) => {
            const id = `media-collapse-${option.id}`
            return (
              <label
                key={option.id}
                htmlFor={id}
                className="hover:bg-muted/60 flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
              >
                <Checkbox
                  id={id}
                  checked={settings.weiboCardCollapsedMediaTypes.includes(option.id)}
                  onCheckedChange={(checked) =>
                    handleMediaCollapseTypeToggle(option.id, checked === true)
                  }
                />
                {option.label}
              </label>
            )
          })}
        </div>
      </FieldSet>

      <Field label="多图展示" description="用于多图片或图片与视频混合的微博媒体">
        <OptionPills
          label="多图展示"
          value={settings.weiboCardMultiMediaLayout}
          options={[
            { value: 'grid', label: '宫格' },
            { value: 'horizontal', label: '画廊' },
          ]}
          onChange={(value) =>
            void updateSettings({
              weiboCardMultiMediaLayout: value as WeiboCardMultiMediaLayout,
            })
          }
        />
      </Field>

      <Field label="视频倍速记忆" description="使用最近一次手动设置的倍速作为视频默认倍速">
        <Switch
          aria-label="视频倍速记忆"
          checked={settings.rememberPlaybackRate}
          onCheckedChange={(checked) =>
            void updateSettings({
              rememberPlaybackRate: checked,
              ...(checked ? {} : { playbackRate: 1 }),
            })
          }
        />
      </Field>

      <FineTuning>
        <SliderSetting
          label="单图最大宽度"
          description="适用于微博媒体、正文引用图和评论图片"
          value={settings.weiboCardSingleImageMaxWidth}
          min={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MIN}
          max={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MAX}
          step={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_STEP}
          onChange={(value) => void updateSettings({ weiboCardSingleImageMaxWidth: value })}
        />
        <SliderSetting
          label="单视频最大宽度"
          description="普通视频使用，直播与回放保持独立布局"
          value={settings.weiboCardSingleVideoMaxWidth}
          min={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MIN}
          max={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_MAX}
          step={WEIBO_CARD_SINGLE_MEDIA_MAX_WIDTH_STEP}
          onChange={(value) => void updateSettings({ weiboCardSingleVideoMaxWidth: value })}
        />
        {settings.weiboCardMultiMediaLayout === 'grid' ? (
          <>
            <Field label="最多展示" description="更多媒体收进最后一格的 +N 提示">
              <Select
                value={String(settings.weiboCardMultiMediaGridLimit)}
                onValueChange={(value) =>
                  void updateSettings({
                    weiboCardMultiMediaGridLimit: Number(value) as WeiboCardMultiMediaGridLimit,
                  })
                }
              >
                <SelectTrigger className="w-28" aria-label="宫格最多展示">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {WEIBO_CARD_MULTI_MEDIA_GRID_LIMIT_OPTIONS.map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value} 项
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <SliderSetting
              label="宫格最大宽度"
              value={settings.weiboCardMultiMediaGridMaxWidth}
              min={WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MIN}
              max={WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_MAX}
              step={WEIBO_CARD_MULTI_MEDIA_GRID_MAX_WIDTH_STEP}
              onChange={(value) => void updateSettings({ weiboCardMultiMediaGridMaxWidth: value })}
            />
          </>
        ) : (
          <SliderSetting
            label="画廊高度"
            description="图片宽度会按原始比例自动调整"
            value={settings.weiboCardMultiMediaStripHeight}
            min={WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MIN}
            max={WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_MAX}
            step={WEIBO_CARD_MULTI_MEDIA_STRIP_HEIGHT_STEP}
            onChange={(value) => void updateSettings({ weiboCardMultiMediaStripHeight: value })}
          />
        )}
      </FineTuning>

      <ResetSectionButton
        label="媒体"
        keys={MEDIA_SETTING_KEYS}
        onReset={() => void updateSettings(defaultsFor(MEDIA_SETTING_KEYS))}
      />
    </SettingsPanel>
  )
}

export function SettingsActionsSection({
  updateSettings,
}: {
  updateSettings: AppSettingsStoreState['updateSettings']
}) {
  const settings = useAppSettings(useShallow((state) => state))

  function handleToolbarButtonToggle(id: FeedToolbarButtonId, checked: boolean) {
    const selected = new Set(settings.feedToolbarButtonIds)
    if (checked) selected.add(id)
    else selected.delete(id)
    void updateSettings({
      feedToolbarButtonIds: FEED_TOOLBAR_BUTTON_IDS.filter((buttonId) => selected.has(buttonId)),
    })
  }

  return (
    <SettingsPanel>
      <StackedField label="微博卡片行为" description="选择点击微博卡片和评论按钮后的打开方式">
        <RadioGroup
          aria-label="微博卡片行为"
          value={settings.feedInteractionMode}
          onValueChange={(value) =>
            void updateSettings({ feedInteractionMode: value as FeedInteractionMode })
          }
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
        >
          {INTERACTION_OPTIONS.map((option) => {
            const id = `feed-interaction-${option.value}`
            const selected = settings.feedInteractionMode === option.value
            return (
              <div key={option.value} className="relative">
                <RadioGroupItem id={id} value={option.value} className="absolute top-3 right-3" />
                <label
                  htmlFor={id}
                  className={cn(
                    'flex min-h-24 cursor-pointer flex-col gap-1 rounded-lg border p-3 pe-9 hover:bg-muted/40',
                    selected && 'border-primary bg-muted/30',
                  )}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <span className="text-muted-foreground text-xs leading-relaxed">
                    {option.description}
                  </span>
                </label>
              </div>
            )
          })}
        </RadioGroup>
      </StackedField>

      <Field label="显示互动数字" description="评论、转发和点赞按钮始终保留">
        <Switch
          aria-label="显示微博互动数字"
          checked={settings.weiboCardShowInteractionCounts}
          onCheckedChange={(checked) =>
            void updateSettings({ weiboCardShowInteractionCounts: checked })
          }
        />
      </Field>

      <FineTuning>
        <StackedField label="微博操作顺序" description="拖动调整评论、转发、点赞的位置">
          <Reorder.Group
            axis="x"
            values={settings.feedPrimaryActionOrder}
            onReorder={(value) => void updateSettings({ feedPrimaryActionOrder: value })}
            className="grid grid-cols-1 gap-2 sm:grid-cols-3"
          >
            {settings.feedPrimaryActionOrder.map((id) => {
              const option = PRIMARY_ACTION_OPTIONS.find((item) => item.id === id)
              if (!option) return null
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  aria-label={`拖动调整${option.label}的位置`}
                  className="bg-background flex min-h-10 cursor-grab items-center gap-2 rounded-md border px-2 py-1.5 active:cursor-grabbing"
                >
                  <GripVertical
                    aria-hidden="true"
                    className="text-muted-foreground size-4 shrink-0"
                  />
                  <option.icon aria-hidden="true" className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm">{option.label}</span>
                </Reorder.Item>
              )
            })}
          </Reorder.Group>
        </StackedField>

        <FieldSet>
          <FieldLegend>固定到操作栏</FieldLegend>
          <p className="text-muted-foreground text-xs leading-relaxed">
            未勾选的工具仍可从更多菜单使用。
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {TOOLBAR_BUTTON_OPTIONS.map((option) => {
              const id = `toolbar-button-${option.id}`
              return (
                <label
                  key={option.id}
                  htmlFor={id}
                  className="hover:bg-muted/60 flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <Checkbox
                    id={id}
                    checked={settings.feedToolbarButtonIds.includes(option.id)}
                    onCheckedChange={(checked) =>
                      handleToolbarButtonToggle(option.id, checked === true)
                    }
                  />
                  <option.icon aria-hidden="true" className="size-4 shrink-0" />
                  {option.label}
                </label>
              )
            })}
          </div>
        </FieldSet>
      </FineTuning>

      <ResetSectionButton
        label="操作"
        keys={ACTION_SETTING_KEYS}
        onReset={() => void updateSettings(defaultsFor(ACTION_SETTING_KEYS))}
      />
    </SettingsPanel>
  )
}

function SliderSetting({
  label,
  description,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  description?: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <Field label={label} description={description}>
      <div className="flex w-72 min-w-0 items-center gap-3">
        <Slider
          min={min}
          max={max}
          step={step}
          value={[value]}
          aria-label={label}
          onValueChange={([next]) => {
            if (next !== undefined) onChange(next)
          }}
        />
        <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
          {value}px
        </output>
      </div>
    </Field>
  )
}
