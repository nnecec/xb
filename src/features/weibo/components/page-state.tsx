import { AlertCircle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export function PageLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="text-muted-foreground flex flex-col items-center gap-3 text-sm">
        <Spinner size="lg" />
        <p>{label}</p>
      </div>
    </div>
  )
}

export function PageErrorState({
  description,
  onRetry,
}: {
  description: string
  onRetry?: () => void
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>无法加载此页面</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {onRetry ? (
          <Button className="mt-2" size="sm" variant="outline" onClick={onRetry}>
            重试
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export function PageEmptyState({ label }: { label: string }) {
  return (
    <div className="border-border/70 bg-card/70 text-muted-foreground flex min-h-64 items-center justify-center border border-dashed px-6 py-10 text-sm">
      {label}
    </div>
  )
}
