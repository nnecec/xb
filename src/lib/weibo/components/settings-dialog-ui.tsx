import { ChevronDown, XIcon } from 'lucide-react'
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Field as UiField,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldTitle,
} from '@/components/ui/field'
import { getUiPortalContainer } from '@/components/ui/portal'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { type AppSettings, DEFAULT_APP_SETTINGS } from '@/lib/app-settings'

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
            aria-label="关闭"
            className="text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50 absolute top-3 right-3 rounded-md p-2 transition-colors focus-visible:ring-3 focus-visible:outline-none"
          >
            <XIcon aria-hidden="true" className="size-4" />
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
      className="w-full justify-start gap-2.5 px-3"
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
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
  options: Array<{ value: T; label: string }>
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

export function FineTuning({
  children,
  defaultOpen = false,
}: {
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="border-t py-3">
      <CollapsibleTrigger className="group text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex min-h-8 w-full items-center justify-between rounded-md text-left text-xs font-medium focus-visible:ring-3 focus-visible:outline-none">
        精细调整
        <ChevronDown
          aria-hidden="true"
          className="size-4 transition-transform group-data-[state=open]:rotate-180"
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">{children}</CollapsibleContent>
    </Collapsible>
  )
}

export function ResetSectionButton({
  label,
  keys,
  onReset,
}: {
  label: string
  keys: readonly (keyof AppSettings)[]
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

export function defaultsFor(keys: readonly (keyof AppSettings)[]): Partial<AppSettings> {
  return Object.fromEntries(
    keys.map((key) => [key, DEFAULT_APP_SETTINGS[key]]),
  ) as Partial<AppSettings>
}

export function IllustrationPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-border bg-muted/20 text-muted-foreground flex items-center justify-center rounded-lg border border-dashed p-4 text-xs">
      {children}
    </div>
  )
}
