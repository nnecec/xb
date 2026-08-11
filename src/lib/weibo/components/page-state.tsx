import { AlertCircle } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'

export function PageLoadingState({
  label,
  isAnnouncedSeparately = false,
}: {
  label: string
  isAnnouncedSeparately?: boolean
}) {
  return (
    <div
      className="flex min-h-64 items-center justify-center"
      aria-hidden={isAnnouncedSeparately || undefined}
    >
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
      <AlertTitle>页面加载失败</AlertTitle>
      <AlertDescription>
        <p>{description}</p>
        {onRetry ? (
          <Button className="mt-2" size="sm" variant="outline" onClick={onRetry}>
            重新加载
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export function PageEmptyState({
  label,
  description = '可以稍后再来，或刷新看看。',
  onRetry,
}: {
  label: string
  description?: string
  onRetry?: () => void
}) {
  return (
    <Empty className="min-h-64 border">
      <EmptyHeader>
        <EmptyTitle>
          <h2>{label}</h2>
        </EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {onRetry ? (
        <EmptyContent>
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            刷新
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
