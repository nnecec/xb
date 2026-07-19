import { XIcon } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import React from 'react'

import { DialogContent } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { getUiPortalContainer } from '@/components/ui/portal'
import { cn } from '@/lib/utils'

const DIALOG_CONTENT_CLASSES = 'flex h-[560px] flex-col gap-0 overflow-hidden p-0 sm:max-w-[680px]'

export function DialogContentMaybeForced({
  forceMount,
  children,
}: {
  forceMount?: boolean
  children: React.ReactNode
}) {
  if (forceMount) {
    return <ForcedDialogContent>{children}</ForcedDialogContent>
  }
  return <DialogContent className={DIALOG_CONTENT_CLASSES}>{children}</DialogContent>
}

function ForcedDialogContent({ children }: { children: React.ReactNode }) {
  const container = React.useMemo(() => getUiPortalContainer(), [])
  return (
    <DialogPrimitive.Portal data-slot="dialog-portal" container={container} forceMount>
      <DialogPrimitive.Overlay
        data-slot="dialog-overlay"
        className="data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50"
        forceMount
      />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        forceMount
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
    </DialogPrimitive.Portal>
  )
}

export function SidebarItem({
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

export function IllustrationPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-muted/30 border-muted-foreground/20 text-muted-foreground flex items-center justify-center rounded-lg border p-4 text-xs">
      {children}
    </div>
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
    <div className="flex flex-col gap-2 py-[11px] first:pt-0 last:pb-0">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Label className="text-sm leading-snug font-medium">{label}</Label>
        {description && (
          <span className="text-muted-foreground text-xs leading-relaxed">{description}</span>
        )}
      </div>
      {children}
    </div>
  )
}

export function OptionPills<T extends string>({
  value,
  options,
  onChange,
  className,
}: {
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      className={cn(
        'bg-muted inline-flex max-w-full shrink-0 flex-wrap rounded-lg p-0.5',
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors',
            value === option.value
              ? 'bg-background text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
