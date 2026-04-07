import { AlertCircle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

export function PageLoadingState({ label }: { label: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
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
      <AlertTitle>Unable to load this page</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {onRetry ? (
          <Button className="mt-2" size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export function PageEmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-[28px] border border-dashed border-border/70 bg-card/70 px-6 py-10 text-sm text-muted-foreground">
      {label}
    </div>
  )
}
