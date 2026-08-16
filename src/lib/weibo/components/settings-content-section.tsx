import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  type AppSettings,
  type ContentDensity,
  type ContentDisplay,
  type ReplyChainDisplay,
} from '@/lib/app-settings'
import { type AppSettingsStoreState, useAppSettings, useShallow } from '@/lib/app-settings-store'

import {
  defaultsFor,
  Field,
  OptionPills,
  ResetSectionButton,
  SettingsPanel,
} from './settings-dialog-ui'

const FEED_SETTING_KEYS = [
  'feedDensity',
  'autoLoadLongText',
] as const satisfies readonly (keyof AppSettings)[]

const WEIBO_SETTING_KEYS = [
  'weiboCardShowAvatar',
  'weiboCardShowTimestamp',
  'weiboCardShowPublishInfo',
  'weiboCardShowTitleBadge',
  'replyChainDisplay',
] as const satisfies readonly (keyof AppSettings)[]

const COMMENT_SETTING_KEYS = [
  'commentDensity',
  'commentCardShowAvatar',
  'commentCardShowTimestamp',
  'commentCardShowPublishInfo',
  'commentCardShowAuthorBadge',
  'commentCardShowLikeCount',
  'commentCardShowThreadLine',
  'commentCardImageDisplay',
  'commentCardCollapseRepliesByDefault',
] as const satisfies readonly (keyof AppSettings)[]

export function SettingsFeedSection({
  updateSettings,
}: {
  updateSettings: AppSettingsStoreState['updateSettings']
}) {
  const settings = useAppSettings(
    useShallow((state) => ({
      feedDensity: state.feedDensity,
      autoLoadLongText: state.autoLoadLongText,
    })),
  )

  return (
    <SettingsPanel>
      <Field label="卡片间距" description="只影响信息流中微博卡片的留白，不改变文字行距">
        <OptionPills
          label="卡片间距"
          value={settings.feedDensity}
          options={[
            { value: 'relaxed', label: '宽松' },
            { value: 'standard', label: '标准' },
            { value: 'compact', label: '紧凑' },
          ]}
          onChange={(value) => void updateSettings({ feedDensity: value as ContentDensity })}
        />
      </Field>
      <Field label="自动查看全文" description="长微博进入视口时自动加载完整内容">
        <Switch
          aria-label="自动查看全文"
          checked={settings.autoLoadLongText}
          onCheckedChange={(checked) => void updateSettings({ autoLoadLongText: checked })}
        />
      </Field>
      <ResetSectionButton
        label="信息流"
        keys={FEED_SETTING_KEYS}
        onReset={() => void updateSettings(defaultsFor(FEED_SETTING_KEYS))}
      />
    </SettingsPanel>
  )
}

export function SettingsCardsSection({
  scrollContainerRef,
  updateSettings,
}: {
  scrollContainerRef: React.RefObject<HTMLElement | null>
  updateSettings: AppSettingsStoreState['updateSettings']
}) {
  const settings = useAppSettings(useShallow((state) => state))

  function handleTabChange() {
    scrollContainerRef.current?.scrollTo?.({ top: 0, behavior: 'instant' })
  }

  return (
    <Tabs defaultValue="weibo" onValueChange={handleTabChange} className="gap-0">
      <div className="bg-background/95 sticky top-0 z-10 border-b px-6 py-2 backdrop-blur-sm">
        <TabsList variant="line" className="grid h-9 w-full grid-cols-2">
          <TabsTrigger value="weibo">微博</TabsTrigger>
          <TabsTrigger value="comment">评论</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="weibo">
        <SettingsPanel>
          <Field label="显示头像">
            <Switch
              aria-label="显示微博头像"
              checked={settings.weiboCardShowAvatar}
              onCheckedChange={(checked) => void updateSettings({ weiboCardShowAvatar: checked })}
            />
          </Field>
          <Field label="显示发布时间">
            <Switch
              aria-label="显示微博发布时间"
              checked={settings.weiboCardShowTimestamp}
              onCheckedChange={(checked) =>
                void updateSettings({ weiboCardShowTimestamp: checked })
              }
            />
          </Field>
          <Field label="显示发布信息" description="控制作者下方的发送设备与归属地整行">
            <Switch
              aria-label="显示微博发布信息"
              checked={settings.weiboCardShowPublishInfo}
              onCheckedChange={(checked) =>
                void updateSettings({ weiboCardShowPublishInfo: checked })
              }
            />
          </Field>
          <Field label="显示标题徽章">
            <Switch
              aria-label="显示微博标题徽章"
              checked={settings.weiboCardShowTitleBadge}
              onCheckedChange={(checked) =>
                void updateSettings({ weiboCardShowTitleBadge: checked })
              }
            />
          </Field>
          <Field label="转发链样式" description="控制“//@用户名:”内容是否转换为引用卡片">
            <OptionPills
              label="转发链样式"
              value={settings.replyChainDisplay}
              options={[
                { value: 'plain', label: '保持原文' },
                { value: 'expanded', label: '展开卡片' },
                { value: 'collapsed', label: '折叠卡片' },
              ]}
              onChange={(value) =>
                void updateSettings({ replyChainDisplay: value as ReplyChainDisplay })
              }
            />
          </Field>
          <ResetSectionButton
            label="微博卡片"
            keys={WEIBO_SETTING_KEYS}
            onReset={() => void updateSettings(defaultsFor(WEIBO_SETTING_KEYS))}
          />
        </SettingsPanel>
      </TabsContent>

      <TabsContent value="comment">
        <SettingsPanel>
          <Field label="评论密度">
            <OptionPills
              label="评论密度"
              value={settings.commentDensity}
              options={[
                { value: 'relaxed', label: '宽松' },
                { value: 'standard', label: '标准' },
                { value: 'compact', label: '紧凑' },
              ]}
              onChange={(value) => void updateSettings({ commentDensity: value as ContentDensity })}
            />
          </Field>
          <Field label="显示头像">
            <Switch
              aria-label="显示评论头像"
              checked={settings.commentCardShowAvatar}
              onCheckedChange={(checked) => void updateSettings({ commentCardShowAvatar: checked })}
            />
          </Field>
          <Field label="显示发布时间">
            <Switch
              aria-label="显示评论发布时间"
              checked={settings.commentCardShowTimestamp}
              onCheckedChange={(checked) =>
                void updateSettings({ commentCardShowTimestamp: checked })
              }
            />
          </Field>
          <Field label="显示发布信息" description="展示评论中可用的发送设备信息">
            <Switch
              aria-label="显示评论发布信息"
              checked={settings.commentCardShowPublishInfo}
              onCheckedChange={(checked) =>
                void updateSettings({ commentCardShowPublishInfo: checked })
              }
            />
          </Field>
          <Field label="显示博主徽章">
            <Switch
              aria-label="显示评论博主徽章"
              checked={settings.commentCardShowAuthorBadge}
              onCheckedChange={(checked) =>
                void updateSettings({ commentCardShowAuthorBadge: checked })
              }
            />
          </Field>
          <Field label="图片内容" description="默认折叠时仍可临时展开当前评论图片">
            <OptionPills
              label="评论图片内容"
              value={settings.commentCardImageDisplay}
              options={[
                { value: 'expanded', label: '默认展开' },
                { value: 'collapsed', label: '默认折叠' },
              ]}
              onChange={(value) =>
                void updateSettings({ commentCardImageDisplay: value as ContentDisplay })
              }
            />
          </Field>
          <Field label="显示点赞数字" description="点赞按钮始终保留">
            <Switch
              aria-label="显示评论点赞数字"
              checked={settings.commentCardShowLikeCount}
              onCheckedChange={(checked) =>
                void updateSettings({ commentCardShowLikeCount: checked })
              }
            />
          </Field>
          <Field label="显示回复线程引导线">
            <Switch
              aria-label="显示评论回复线程引导线"
              checked={settings.commentCardShowThreadLine}
              onCheckedChange={(checked) =>
                void updateSettings({ commentCardShowThreadLine: checked })
              }
            />
          </Field>
          <Field label="默认折叠回复" description="顶层评论照常显示，其下回复折叠为查看入口">
            <Switch
              aria-label="默认折叠评论回复"
              checked={settings.commentCardCollapseRepliesByDefault}
              onCheckedChange={(checked) =>
                void updateSettings({ commentCardCollapseRepliesByDefault: checked })
              }
            />
          </Field>
          <ResetSectionButton
            label="评论卡片"
            keys={COMMENT_SETTING_KEYS}
            onReset={() => void updateSettings(defaultsFor(COMMENT_SETTING_KEYS))}
          />
        </SettingsPanel>
      </TabsContent>
    </Tabs>
  )
}
