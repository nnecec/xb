import { Palette, Settings, Sparkles, Type } from 'lucide-react'
import React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

import darkModeImageDimJpeg from '@/assets/images/dark-mode-image-dim.jpeg'
import myGroupsJpeg from '@/assets/images/my-groups.jpeg'
import collapseReplyChain from '@/assets/images/quotechains-collapsible.jpeg'
import quoteChainsJpeg from '@/assets/images/quotechains.jpeg'
import xLayoutJpeg from '@/assets/images/x-layout.jpeg'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  VisuallyHidden,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { DARK_BG_PRESETS, DEFAULT_APP_SETTINGS, LIGHT_BG_PRESETS } from '@/lib/app-settings'
import type {
  AppTheme,
  ContentWidth,
  DarkBgColorPreset,
  FontFamilyClass,
  FontSizeClass,
  FontWeightClass,
  LetterSpacingClass,
  LightBgColorPreset,
  LineHeightClass,
  StatusDetailPopupPosition,
} from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
import { cn } from '@/lib/utils'
import { BgColorPicker } from '@/lib/weibo/components/bg-color-picker'
import { MAX_ENTRIES } from '@/lib/weibo/hooks/use-browsing-history'

import { FontPreviewCard } from './settings-font-preview'

const SIDEBAR_GROUPS = [
  { id: 'appearance' as const, label: '外观', icon: Palette },
  { id: 'personalize' as const, label: '个性化', icon: Sparkles },
  { id: 'font' as const, label: '字体', icon: Type },
  { id: 'features' as const, label: '特色功能', icon: Settings },
  { id: 'advanced' as const, label: '高级', icon: Settings },
]

type GroupId = (typeof SIDEBAR_GROUPS)[number]['id']

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hover:bg-accent/50 data-[active=true]:bg-primary data-[active=true]:text-primary-foreground flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors data-[active=true]:font-medium"
      data-active={active || undefined}
    >
      <Icon size={16} strokeWidth={1.5} />
      {label}
    </button>
  )
}

function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-[11px] first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <Label className="text-sm leading-snug font-medium">{label}</Label>
        {description && (
          <span className="text-muted-foreground text-xs leading-relaxed">{description}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function IllustrationPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 border-muted-foreground/20 text-muted-foreground flex items-center justify-center rounded-lg border p-4 text-xs">
      {children}
    </div>
  )
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [version, setVersion] = useState<string>('')
  const [activeGroup, setActiveGroup] = useState<GroupId>('appearance')

  const fontSizeClass = useAppSettings((s) => s.fontSizeClass)
  const fontWeightClass = useAppSettings((s) => s.fontWeightClass)
  const letterSpacingClass = useAppSettings((s) => s.letterSpacingClass)
  const lineHeightClass = useAppSettings((s) => s.lineHeightClass)
  const fontFamilyClass = useAppSettings((s) => s.fontFamilyClass)
  const showHotSearchCard = useAppSettings((s) => s.showHotSearchCard)
  const collapseRepliesEnabled = useAppSettings((s) => s.collapseRepliesEnabled)
  const renderReplyChainEnabled = useAppSettings((s) => s.renderReplyChainEnabled)
  const darkModeImageDim = useAppSettings((s) => s.darkModeImageDim)
  const statusDetailPopupEnabled = useAppSettings((s) => s.statusDetailPopupEnabled)
  const statusDetailPopupPosition = useAppSettings((s) => s.statusDetailPopupPosition)
  const statusDetailPopupWidth = useAppSettings((s) => s.statusDetailPopupWidth)
  const theme = useAppSettings((s) => s.theme)
  const lightModeBgColor = useAppSettings((s) => s.lightModeBgColor)
  const darkModeBgColor = useAppSettings((s) => s.darkModeBgColor)
  const backgroundEnabled = useAppSettings((s) => s.backgroundEnabled)
  const glassOpacity = useAppSettings((s) => s.glassOpacity)
  const glassBlur = useAppSettings((s) => s.glassBlur)
  const backgroundImageUrl = useAppSettings((s) => s.backgroundImageUrl)
  const xLayoutEnabled = useAppSettings((s) => s.xLayoutEnabled)
  const waterfallColumnCount = useAppSettings((s) => s.waterfallColumnCount)
  const contentWidth = useAppSettings((s) => s.contentWidth)
  const followGroupsEnabled = useAppSettings((s) => s.followGroupsEnabled)
  const xbTopicPage = useAppSettings((s) => s.xbTopicPage)
  const setFontSizeClass = useAppSettings((s) => s.setFontSizeClass)
  const setFontWeightClass = useAppSettings((s) => s.setFontWeightClass)
  const setLetterSpacingClass = useAppSettings((s) => s.setLetterSpacingClass)
  const setLineHeightClass = useAppSettings((s) => s.setLineHeightClass)
  const setFontFamilyClass = useAppSettings((s) => s.setFontFamilyClass)
  const setShowHotSearchCard = useAppSettings((s) => s.setShowHotSearchCard)
  const setCollapseRepliesEnabled = useAppSettings((s) => s.setCollapseRepliesEnabled)
  const setRenderReplyChainEnabled = useAppSettings((s) => s.setRenderReplyChainEnabled)
  const setDarkModeImageDim = useAppSettings((s) => s.setDarkModeImageDim)
  const setTheme = useAppSettings((s) => s.setTheme)
  const setLightModeBgColor = useAppSettings((s) => s.setLightModeBgColor)
  const setDarkModeBgColor = useAppSettings((s) => s.setDarkModeBgColor)
  const setStatusDetailPopupEnabled = useAppSettings((s) => s.setStatusDetailPopupEnabled)
  const setStatusDetailPopupPosition = useAppSettings((s) => s.setStatusDetailPopupPosition)
  const setStatusDetailPopupWidth = useAppSettings((s) => s.setStatusDetailPopupWidth)
  const setBackgroundEnabled = useAppSettings((s) => s.setBackgroundEnabled)
  const setGlassOpacity = useAppSettings((s) => s.setGlassOpacity)
  const setGlassBlur = useAppSettings((s) => s.setGlassBlur)
  const setBackgroundImageUrl = useAppSettings((s) => s.setBackgroundImageUrl)
  const setXLayoutEnabled = useAppSettings((s) => s.setXLayoutEnabled)
  const setWaterfallColumnCount = useAppSettings((s) => s.setWaterfallColumnCount)
  const setContentWidth = useAppSettings((s) => s.setContentWidth)
  const browsingHistoryEnabled = useAppSettings((s) => s.browsingHistoryEnabled)
  const setBrowsingHistoryEnabled = useAppSettings((s) => s.setBrowsingHistoryEnabled)
  const setFollowGroupsEnabled = useAppSettings((s) => s.setFollowGroupsEnabled)
  const setNativeTopicPage = useAppSettings((s) => s.setNativeTopicPage)
  const [imagePreviewError, setImagePreviewError] = useState(false)
  const validateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const validateImageUrl = useCallback((url: string) => {
    if (validateTimerRef.current) {
      clearTimeout(validateTimerRef.current)
    }
    setImagePreviewError(false)

    if (!url) return

    validateTimerRef.current = setTimeout(async () => {
      try {
        const resp = await fetch(url, { method: 'HEAD', mode: 'no-cors' })
        if (resp.type === 'opaque') return
        if (!resp.ok) {
          toast.warning(`背景图片加载失败 (HTTP ${resp.status})`, {
            description: '请检查 URL 是否正确',
          })
          setImagePreviewError(true)
        }
      } catch {}
    }, 800)
  }, [])

  const handleBackgroundImageUrlChange = useCallback(
    (url: string) => {
      setBackgroundImageUrl(url)
      validateImageUrl(url)
    },
    [setBackgroundImageUrl, validateImageUrl],
  )

  useEffect(() => {
    if (typeof browser !== 'undefined' && browser.runtime?.getManifest) {
      setVersion(browser.runtime.getManifest().version)
    }
    return () => {
      if (validateTimerRef.current) {
        clearTimeout(validateTimerRef.current)
      }
    }
  }, [])

  function resetFontSettings() {
    setFontSizeClass(DEFAULT_APP_SETTINGS.fontSizeClass)
    setFontWeightClass(DEFAULT_APP_SETTINGS.fontWeightClass)
    setLetterSpacingClass(DEFAULT_APP_SETTINGS.letterSpacingClass)
    setLineHeightClass(DEFAULT_APP_SETTINGS.lineHeightClass)
    setFontFamilyClass(DEFAULT_APP_SETTINGS.fontFamilyClass)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[520px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="px-6 pt-5 text-base tracking-tight">设置</DialogTitle>
          <VisuallyHidden>
            <DialogDescription>配置外观、个性化偏好和字体设置</DialogDescription>
          </VisuallyHidden>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="border-border/40 w-[180px] shrink-0 overflow-y-auto border-r p-3">
            <div className="flex flex-col gap-0.5">
              {SIDEBAR_GROUPS.map((group) => (
                <SidebarItem
                  key={group.id}
                  icon={group.icon}
                  label={group.label}
                  active={activeGroup === group.id}
                  onClick={() => setActiveGroup(group.id)}
                />
              ))}
            </div>
          </aside>

          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
            {activeGroup === 'appearance' && (
              <div className="px-6 py-4">
                <Field label="深色模式" description="选择应用的配色方案">
                  <Select value={theme} onValueChange={(v) => setTheme(v as AppTheme)}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">跟随系统</SelectItem>
                      <SelectItem value="light">浅色</SelectItem>
                      <SelectItem value="dark">深色</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="浅色模式" description="浅色模式下的背景颜色">
                  <BgColorPicker
                    presets={LIGHT_BG_PRESETS}
                    value={lightModeBgColor}
                    onChange={(v) => setLightModeBgColor(v as LightBgColorPreset)}
                  />
                </Field>
                <Field label="深色模式" description="深色模式下的背景颜色">
                  <BgColorPicker
                    presets={DARK_BG_PRESETS}
                    value={darkModeBgColor}
                    onChange={(v) => setDarkModeBgColor(v as DarkBgColorPreset)}
                  />
                </Field>
              </div>
            )}

            {activeGroup === 'personalize' && (
              <div className="space-y-3 px-6 py-4">
                <div>
                  <Field label="热搜卡片" description="在右侧边栏显示热搜内容">
                    <Switch
                      checked={showHotSearchCard}
                      onCheckedChange={(checked) => setShowHotSearchCard(checked)}
                    />
                  </Field>
                </div>
                <div>
                  <Field label="图片蒙版" description="深色模式下为小图添加变暗效果防刺眼">
                    <Switch
                      checked={darkModeImageDim}
                      onCheckedChange={(checked) => setDarkModeImageDim(checked)}
                    />
                  </Field>
                  {darkModeImageDim && (
                    <IllustrationPlaceholder>
                      <img src={darkModeImageDimJpeg} alt="图片蒙版" className="h-auto w-full" />
                    </IllustrationPlaceholder>
                  )}
                </div>
                <div>
                  <Field label="内容宽度" description="大屏幕下中间内容区域的宽度">
                    <Select
                      value={contentWidth}
                      onValueChange={(v) => setContentWidth(v as ContentWidth)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">标准</SelectItem>
                        <SelectItem value="wide">宽</SelectItem>
                        <SelectItem value="wider">更宽</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <div>
                  <Field label="X 操作栏" description="使用 X 风格的操作栏（含收藏和分享按钮）">
                    <Switch
                      checked={xLayoutEnabled}
                      onCheckedChange={(checked) => setXLayoutEnabled(checked)}
                    />
                  </Field>
                  {xLayoutEnabled && (
                    <IllustrationPlaceholder>
                      <img src={xLayoutJpeg} alt="X 操作栏布局" className="h-auto w-full" />
                    </IllustrationPlaceholder>
                  )}
                </div>
                <div>
                  <Field label="关注分组" description="在信息流中按分组筛选关注人">
                    <Switch
                      checked={followGroupsEnabled}
                      onCheckedChange={(checked) => setFollowGroupsEnabled(checked)}
                    />
                  </Field>
                  {followGroupsEnabled && (
                    <IllustrationPlaceholder>
                      <img src={myGroupsJpeg} alt="关注分组" className="h-auto w-full" />
                    </IllustrationPlaceholder>
                  )}
                </div>
                <div>
                  <Field label="QuoteChains 渲染" description='将 "//@ 用户名:" 格式渲染成引用样式'>
                    <Switch
                      checked={renderReplyChainEnabled}
                      onCheckedChange={(checked) => setRenderReplyChainEnabled(checked)}
                    />
                  </Field>
                  {renderReplyChainEnabled && (
                    <IllustrationPlaceholder>
                      <img src={quoteChainsJpeg} alt="QuoteChains 渲染" className="h-auto w-full" />
                    </IllustrationPlaceholder>
                  )}
                </div>
                {renderReplyChainEnabled && (
                  <div>
                    <Field label="折叠 QuoteChains" description="超过2条时折叠中间的引用">
                      <Switch
                        checked={collapseRepliesEnabled}
                        onCheckedChange={(checked) => setCollapseRepliesEnabled(checked)}
                      />
                    </Field>
                    <IllustrationPlaceholder>
                      <img
                        src={collapseReplyChain}
                        alt="折叠 QuoteChains"
                        className="h-auto w-full"
                      />
                    </IllustrationPlaceholder>
                  </div>
                )}
              </div>
            )}

            {activeGroup === 'font' && (
              <div className="flex flex-col">
                <div className="bg-background sticky top-0 z-10 border-b px-6 py-4">
                  <FontPreviewCard />
                </div>

                <div className="divide-border/40 divide-y px-6 py-4">
                  <Field label="字体大小" description="微博正文和评论的字体大小">
                    <Select
                      value={fontSizeClass}
                      onValueChange={(v) => setFontSizeClass(v as FontSizeClass)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text-xs">12px</SelectItem>
                        <SelectItem value="text-sm">14px</SelectItem>
                        <SelectItem value="text-base">16px</SelectItem>
                        <SelectItem value="text-lg">18px</SelectItem>
                        <SelectItem value="text-xl">20px</SelectItem>
                        <SelectItem value="text-2xl">24px</SelectItem>
                        <SelectItem value="text-3xl">30px</SelectItem>
                        <SelectItem value="text-4xl">36px</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="字体粗细" description="微博正文和评论的字体粗细">
                    <Select
                      value={fontWeightClass}
                      onValueChange={(v) => setFontWeightClass(v as FontWeightClass)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="font-thin">100 细</SelectItem>
                        <SelectItem value="font-extralight">200</SelectItem>
                        <SelectItem value="font-light">300</SelectItem>
                        <SelectItem value="font-normal">400 标准</SelectItem>
                        <SelectItem value="font-medium">500</SelectItem>
                        <SelectItem value="font-semibold">600</SelectItem>
                        <SelectItem value="font-bold">700 粗</SelectItem>
                        <SelectItem value="font-extrabold">800</SelectItem>
                        <SelectItem value="font-black">900</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="字间距" description="字符之间的间距">
                    <Select
                      value={letterSpacingClass}
                      onValueChange={(v) => setLetterSpacingClass(v as LetterSpacingClass)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="tracking-tighter">更紧凑</SelectItem>
                        <SelectItem value="tracking-tight">紧凑</SelectItem>
                        <SelectItem value="tracking-normal">标准</SelectItem>
                        <SelectItem value="tracking-wide">宽松</SelectItem>
                        <SelectItem value="tracking-wider">更宽松</SelectItem>
                        <SelectItem value="tracking-widest">最宽松</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="行高" description="文本行之间的间距">
                    <Select
                      value={lineHeightClass}
                      onValueChange={(v) => setLineHeightClass(v as LineHeightClass)}
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="leading-none">无</SelectItem>
                        <SelectItem value="leading-tight">紧凑</SelectItem>
                        <SelectItem value="leading-snug">适中偏紧</SelectItem>
                        <SelectItem value="leading-normal">标准</SelectItem>
                        <SelectItem value="leading-relaxed">宽松</SelectItem>
                        <SelectItem value="leading-loose">更宽松</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field label="字体样式" description="微博正文和评论的字体">
                    <Select
                      value={fontFamilyClass}
                      onValueChange={(v) => setFontFamilyClass(v as FontFamilyClass)}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>本地字体</SelectLabel>
                          <SelectItem value="font-sans">默认无衬线</SelectItem>
                          <SelectItem value="font-serif">默认衬线</SelectItem>
                          <SelectItem value="font-simhei">黑体</SelectItem>
                          <SelectItem value="font-simsun">宋体</SelectItem>
                          <SelectItem value="font-kaiti">楷体</SelectItem>
                          <SelectItem value="font-fangsong">仿宋</SelectItem>
                        </SelectGroup>
                        <SelectGroup>
                          <SelectLabel>远程字体</SelectLabel>
                          <SelectItem value="font-lxgw-wenkai">霞鹜文楷</SelectItem>
                          <SelectItem value="font-smiley-sans">得意黑</SelectItem>
                          <SelectItem value="font-zhuque">朱雀仿宋</SelectItem>
                          <SelectItem value="font-source-han-serif">思源宋体</SelectItem>
                          <SelectItem value="font-source-han-sans">思源黑体</SelectItem>
                          <SelectItem value="font-fz-kai">方正楷体</SelectItem>
                          <SelectItem value="font-canger-jinkai">仓耳今楷</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </Field>

                  <div className="mt-3 flex justify-end">
                    <Button variant="outline" size="sm" onClick={resetFontSettings}>
                      恢复默认
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {activeGroup === 'features' && (
              <div className="divide-border/40 divide-y px-6 py-4">
                <Field label="弹窗详情" description="点击微博后在弹窗中打开详情，而非新页面">
                  <Switch
                    checked={statusDetailPopupEnabled}
                    onCheckedChange={(checked) => setStatusDetailPopupEnabled(checked)}
                  />
                </Field>

                {statusDetailPopupEnabled && (
                  <Field label="弹窗位置" description="详情弹窗在屏幕上的显示位置">
                    <Select
                      value={statusDetailPopupPosition}
                      onValueChange={(value) =>
                        setStatusDetailPopupPosition(value as StatusDetailPopupPosition)
                      }
                    >
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">左</SelectItem>
                        <SelectItem value="center">中</SelectItem>
                        <SelectItem value="right">右</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {statusDetailPopupEnabled && (
                  <div className="flex flex-col gap-2">
                    <Label>弹窗宽度</Label>
                    <p className="text-muted-foreground text-xs">
                      详情弹窗占页面宽度的比例 ({statusDetailPopupWidth}%)
                    </p>
                    <Slider
                      value={[statusDetailPopupWidth]}
                      min={50}
                      max={80}
                      step={5}
                      onValueChange={([value]) => setStatusDetailPopupWidth(value)}
                    />
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  <Label>瀑布流栏数</Label>
                  <p className="text-muted-foreground text-xs">
                    设为 1 时关闭瀑布流，2-5 栏自适应排列 ({waterfallColumnCount} 栏)单栏不低于
                    300px
                  </p>
                  <Slider
                    value={[waterfallColumnCount]}
                    min={1}
                    max={5}
                    step={1}
                    onValueChange={([value]) => setWaterfallColumnCount(value)}
                  />
                </div>

                <Field label="自定义背景" description="为页面添加自定义背景图片">
                  <Switch
                    checked={backgroundEnabled}
                    onCheckedChange={(checked) => setBackgroundEnabled(checked)}
                  />
                </Field>

                {backgroundEnabled && (
                  <Field label="背景图片" description="输入图片 URL 作为背景">
                    <div className="flex items-center gap-2">
                      <Input
                        type="url"
                        placeholder="https://example.com/bg.jpg"
                        value={backgroundImageUrl}
                        onChange={(e) => handleBackgroundImageUrlChange(e.target.value)}
                        className="h-8 w-[180px]"
                      />
                      {backgroundImageUrl ? (
                        <div
                          className={cn(
                            'size-8 shrink-0 overflow-hidden rounded-md border',
                            imagePreviewError && 'border-destructive',
                          )}
                        >
                          <img
                            src={backgroundImageUrl}
                            alt="背景预览"
                            className="size-full object-cover"
                            onError={() => setImagePreviewError(true)}
                            onLoad={() => setImagePreviewError(false)}
                          />
                        </div>
                      ) : null}
                    </div>
                  </Field>
                )}

                <div className="flex flex-col gap-2">
                  <Label>玻璃透明度</Label>
                  <p className="text-muted-foreground text-xs">
                    卡片和弹窗的半透明程度 ({glassOpacity}%)
                  </p>
                  <Slider
                    value={[glassOpacity]}
                    min={0}
                    max={100}
                    step={5}
                    onValueChange={([v]) => setGlassOpacity(v as number)}
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <Label>玻璃模糊</Label>
                  <p className="text-muted-foreground text-xs">
                    卡片和弹窗的背景模糊程度 ({glassBlur}px)
                  </p>
                  <Slider
                    value={[glassBlur]}
                    min={0}
                    max={20}
                    step={1}
                    onValueChange={([v]) => setGlassBlur(v as number)}
                  />
                </div>

                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setStatusDetailPopupEnabled(DEFAULT_APP_SETTINGS.statusDetailPopupEnabled)
                      setStatusDetailPopupPosition(DEFAULT_APP_SETTINGS.statusDetailPopupPosition)
                      setStatusDetailPopupWidth(DEFAULT_APP_SETTINGS.statusDetailPopupWidth)
                      setWaterfallColumnCount(DEFAULT_APP_SETTINGS.waterfallColumnCount)
                      setBackgroundEnabled(DEFAULT_APP_SETTINGS.backgroundEnabled)
                      setBackgroundImageUrl(DEFAULT_APP_SETTINGS.backgroundImageUrl)
                      setGlassOpacity(DEFAULT_APP_SETTINGS.glassOpacity)
                      setGlassBlur(DEFAULT_APP_SETTINGS.glassBlur)
                    }}
                  >
                    恢复默认
                  </Button>
                </div>
              </div>
            )}

            {activeGroup === 'advanced' && (
              <div className="divide-border/40 divide-y px-6 py-4">
                <Field label="内置话题页" description="使用 xb 内置话题页，关闭则跳转原微博话题页">
                  <Switch
                    checked={xbTopicPage}
                    onCheckedChange={(checked) => setNativeTopicPage(checked)}
                  />
                </Field>
                <Field
                  label="浏览历史"
                  description={`记录最近访问过的${MAX_ENTRIES}条微博（储存在本地）`}
                >
                  <Switch
                    checked={browsingHistoryEnabled}
                    onCheckedChange={(checked) => setBrowsingHistoryEnabled(checked)}
                  />
                </Field>
              </div>
            )}
          </main>
        </div>

        {version && (
          <div className="border-border/40 flex shrink-0 items-center justify-between border-t px-6 py-3">
            <a
              href="https://xb-extension.vercel.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground font-mono text-[11px] transition-colors"
            >
              xb v{version}
            </a>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/nnecec"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
              >
                @nnecec
              </a>
              <a
                href="https://github.com/nnecec/xb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground text-[11px] transition-colors"
              >
                GitHub
              </a>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
