import darkModeImageDimJpeg from '@/assets/images/dark-mode-image-dim.jpeg'
import collapseReplyChain from '@/assets/images/quotechains-collapsible.jpeg'
import quoteChainsJpeg from '@/assets/images/quotechains.jpeg'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import type { FeedInteractionMode } from '@/lib/app-settings'
import { cn } from '@/lib/utils'

import { Field, IllustrationPlaceholder, StackedField } from './settings-dialog-ui'

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

export function SettingsPersonalizeSection({
  feedInteractionMode,
  darkModeImageDim,
  autoLoadLongText,
  textOnlyFeed,
  rememberPlaybackRate,
  firstLoadRedirect,
  renderReplyChainEnabled,
  collapseRepliesEnabled,
  updateSettings,
}: {
  feedInteractionMode: FeedInteractionMode
  darkModeImageDim: boolean
  autoLoadLongText: boolean
  textOnlyFeed: boolean
  rememberPlaybackRate: boolean
  firstLoadRedirect: string
  renderReplyChainEnabled: boolean
  collapseRepliesEnabled: boolean
  updateSettings: (patch: Record<string, unknown>) => void | Promise<void>
}) {
  return (
    <div className="space-y-3 px-6 py-4">
      <StackedField label="微博卡片行为" description="选择点击微博卡片和评论按钮后的打开方式">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
          {FEED_INTERACTION_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={feedInteractionMode === option.value}
              onClick={() => void updateSettings({ feedInteractionMode: option.value })}
              className={cn(
                'border-border bg-background hover:bg-accent/30 rounded-lg border p-3 text-left transition-[box-shadow,border-color]',
                feedInteractionMode === option.value && 'border-primary ring-primary/30 ring-2',
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
      <div>
        <Field label="自动查看全文" description="长微博进入视口时自动加载完整内容">
          <Switch
            checked={autoLoadLongText}
            onCheckedChange={(checked) => void updateSettings({ autoLoadLongText: checked })}
          />
        </Field>
      </div>
      <div>
        <Field label="纯文字信息流" description="隐藏头像与所有媒体内容，提高信息密度">
          <Switch
            checked={textOnlyFeed}
            onCheckedChange={(checked) => void updateSettings({ textOnlyFeed: checked })}
          />
        </Field>
      </div>
      <div>
        <Field label="暗色模式降低图片亮度" description="降低小图亮度，减少深色模式下的刺眼感">
          <Switch
            checked={darkModeImageDim}
            onCheckedChange={(checked) => void updateSettings({ darkModeImageDim: checked })}
          />
        </Field>
        <IllustrationPlaceholder>
          <img
            src={darkModeImageDimJpeg}
            alt="暗色模式降低图片亮度效果"
            className="h-auto w-full"
          />
        </IllustrationPlaceholder>
      </div>
      <div>
        <Field label="视频倍速记忆" description="开启后，最近一次手动设置的倍速作为视频的默认倍速">
          <Switch
            checked={rememberPlaybackRate}
            onCheckedChange={(checked) =>
              void updateSettings({
                rememberPlaybackRate: checked,
                // 关闭时同步重置缓存为 1，确保下次开启从干净状态开始
                ...(checked ? {} : { playbackRate: 1 }),
              })
            }
          />
        </Field>
      </div>
      <div>
        <Field label="首页默认时间线" description="进入微博首页时，自动打开指定时间线">
          <Select
            value={firstLoadRedirect}
            onValueChange={(value) =>
              void updateSettings({
                firstLoadRedirect: value as typeof firstLoadRedirect,
              })
            }
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="for-you">推荐</SelectItem>
              <SelectItem value="following">我关注的</SelectItem>
              <SelectItem value="special-follow">特别关注</SelectItem>
              <SelectItem value="friend-circle">朋友圈</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div>
        <Field label="转发链样式" description='将 "//@用户名:" 格式显示为引用卡片'>
          <Switch
            checked={renderReplyChainEnabled}
            onCheckedChange={(checked) => void updateSettings({ renderReplyChainEnabled: checked })}
          />
        </Field>
        <IllustrationPlaceholder>
          <img src={quoteChainsJpeg} alt="转发链样式效果" className="h-auto w-full" />
        </IllustrationPlaceholder>
      </div>
      {renderReplyChainEnabled && (
        <div>
          <Field label="折叠转发链" description="转发链超过 2 条时，折叠中间内容">
            <Switch
              checked={collapseRepliesEnabled}
              onCheckedChange={(checked) =>
                void updateSettings({ collapseRepliesEnabled: checked })
              }
            />
          </Field>
          <IllustrationPlaceholder>
            <img src={collapseReplyChain} alt="折叠转发链效果" className="h-auto w-full" />
          </IllustrationPlaceholder>
        </div>
      )}
    </div>
  )
}
