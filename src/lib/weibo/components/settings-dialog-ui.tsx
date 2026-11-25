import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import React from 'react'

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
import {
  Field as UiField,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from '@/components/ui/field'
import { getUiPortalContainer } from '@/components/ui/portal'
import { Slider } from '@/components/ui/slider'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  DEFAULT_FLAT_APP_SETTINGS,
  type FlatAppSettings,
  type AppSettingsPatch,
} from '@/lib/app-settings'

const DIALOG_CONTENT_CLASSES =
  'fixed bottom-4 left-4 z-50 flex h-[min(560px,80vh)] w-[min(720px,84vw)] max-w-none flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-lg outline-none'

export function DialogContentMaybeForced({
  forceMount,
  children,
}: {
  forceMount?: boolean
  children: React.ReactNode
}) {
  const container = React.useMemo(() => getUiPortalContainer(), [])
  // Nest Content inside Overlay so react-remove-scroll treats the dialog as a
  // scrollable descendant. Sibling Overlay/Content relies on shards, which can
  // fail to unlock wheel scrolling for nested overflow panes in the shadow root.
  return (
    <DialogPrimitive.Portal
      data-slot="dialog-portal"
      container={container}
      forceMount={forceMount || undefined}
    >
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/25"
        forceMount={forceMount || undefined}
      >
        <DialogPrimitive.Content
          data-slot="dialog-content"
          forceMount={forceMount || undefined}
          className={DIALOG_CONTENT_CLASSES}
        >
          {children}
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">关闭</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Overlay>
    </DialogPrimitive.Portal>
  )
}

export function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant={active ? 'default' : 'ghost'}
      size="lg"
      static
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className="w-full justify-start"
    >
      <Icon aria-hidden="true" data-icon="inline-start" />
      {label}
    </Button>
  )
}

export function Field({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children?: React.ReactNode
}) {
  return (
    <UiField orientation="horizontal" className="min-h-12 py-2.5">
      <FieldContent>
        <FieldTitle>{label}</FieldTitle>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
      <div className="flex min-w-0 shrink-0 items-center justify-end">{children}</div>
    </UiField>
  )
}

export function StackedField({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <UiField orientation="vertical" className="gap-2 py-3 first:pt-0 last:pb-0">
      <FieldContent>
        <FieldTitle>{label}</FieldTitle>
        {description && <FieldDescription>{description}</FieldDescription>}
      </FieldContent>
      {children}
    </UiField>
  )
}

export function SettingsPanel({ children }: { children: React.ReactNode }) {
  return <FieldGroup className="gap-0 px-6 py-5">{children}</FieldGroup>
}

export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-1 border-b py-4 first:pt-0 last:border-b-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-xs leading-relaxed">{description}</p>
      )}
      <div className="mt-2 flex flex-col">{children}</div>
    </section>
  )
}

export function OptionPills<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <ToggleGroup
      value={[value]}
      onValueChange={(values) => {
        const next = values[0] as T | undefined
        if (next) onChange(next)
      }}
      aria-label={label}
      variant="outline"
      size="sm"
      spacing={0}
      className={`bg-muted/60 max-w-full shrink-0 flex-wrap p-0.5 ${className ?? ''}`}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          aria-label={option.label}
          className="aria-pressed:border-border aria-pressed:bg-background rounded-md border-transparent px-2.5 text-xs aria-pressed:shadow-xs"
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}

export function CommitSlider({
  label,
  value,
  min,
  max,
  step,
  onCommit,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onCommit: (value: number) => void
}) {
  const [draft, setDraft] = React.useState<number | null>(null)
  const shown = draft ?? value

  return (
    <div className="flex w-72 min-w-0 items-center gap-3">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[shown]}
        aria-label={label}
        onValueChange={([next]) => {
          if (next !== undefined) setDraft(next)
        }}
        onValueCommit={([next]) => {
          setDraft(null)
          if (next !== undefined && next !== value) onCommit(next)
        }}
      />
      <output className="text-muted-foreground w-16 shrink-0 text-right font-mono text-xs tabular-nums">
        {shown}px
      </output>
    </div>
  )
}

export function FineTuning({ children }: { children: React.ReactNode }) {
  return <div className="border-t py-3">{children}</div>
}

export function ResetSectionButton({
  label,
  keys,
  onReset,
}: {
  label: string
  keys: readonly (keyof FlatAppSettings)[]
  onReset: () => void
}) {
  return (
    <div className="flex justify-end border-t pt-4" data-setting-count={keys.length}>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm">
            恢复默认设置
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>恢复“{label}”默认设置？</AlertDialogTitle>
            <AlertDialogDescription>
              只会重置“{label}”中的设置，不影响其他模块、主题或字体。
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

const SETTING_GROUPS = {
  appearance: new Set([
    'theme',
    'rewriteEnabled',
    'uiFontSize',
    'contentFontSize',
    'fontWeightClass',
    'letterSpacingClass',
    'lineHeightClass',
    'fontFamilyClass',
    'fontApplyScope',
    'motionPreference',
    'darkModeImageDim',
    'lightModeBgColor',
    'darkModeBgColor',
  ]),
  navigation: new Set([
    'shellLayout',
    'columnWidth',
    'customColumnWidth',
    'showExplore',
    'showFavorites',
    'showHistory',
    'showNotifications',
    'showDMs',
    'showProfile',
    'showCompose',
    'xbEntryCollapsed',
    'sidebarCollapsed',
  ]),
  feed: new Set([
    'replyChainDisplay',
    'autoLoadLongText',
    'feedDensity',
    'weiboCardShowAvatar',
    'weiboCardShowTimestamp',
    'weiboCardShowPublishInfo',
    'weiboCardShowTitleBadge',
    'weiboCardShowInteractionCounts',
    'weiboCardCollapsedMediaTypes',
    'weiboCardSingleImageMaxWidth',
    'weiboCardSingleVideoMaxWidth',
    'weiboCardMultiMediaLayout',
    'weiboCardMultiMediaGridLimit',
    'weiboCardMultiMediaGridMaxWidth',
    'weiboCardMultiMediaStripHeight',
    'commentDensity',
    'commentCardShowAvatar',
    'commentCardShowTimestamp',
    'commentCardShowPublishInfo',
    'commentCardShowAuthorBadge',
    'commentCardShowLikeCount',
    'commentCardShowThreadLine',
    'commentCardImageDisplay',
    'commentCardCollapseRepliesByDefault',
    'hotSearchType',
    'feedInteractionMode',
    'feedPrimaryActionOrder',
    'feedToolbarButtonIds',
    'browsingHistoryLimit',
  ]),
  imageGen: new Set([
    'imageGenShowDataArea',
    'imageGenShowFullImages',
    'imageGenShowWeiboLink',
    'imageGenTheme',
    'imageGenCardStyle',
  ]),
  home: new Set(['firstLoadRedirect', 'homeTab', 'homeGroupId']),
  features: new Set(['xbTopicPage', 'ratingEnabled']),
  media: new Set([
    'rememberPlaybackRate',
    'playbackRate',
    'videoQualityPreference',
    'photoLoopEnabled',
  ]),
  themes: new Set([
    'customThemeLightCss',
    'customThemeDarkCss',
    'selectedThemeType',
    'selectedThemeId',
    'userThemes',
  ]),
} as const

export function defaultsFor(keys: readonly (keyof FlatAppSettings)[]): AppSettingsPatch {
  const patch: AppSettingsPatch = {}
  for (const key of keys) {
    const group = (Object.keys(SETTING_GROUPS) as (keyof typeof SETTING_GROUPS)[]).find((name) =>
      SETTING_GROUPS[name].has(key),
    )
    if (group) patch[group] = { ...patch[group], [key]: DEFAULT_FLAT_APP_SETTINGS[key] } as never
  }
  return patch
}

export function IllustrationPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border bg-muted/20 text-muted-foreground flex items-center justify-center rounded-lg border border-dashed p-4 text-xs">
      {children}
    </div>
  )
}
