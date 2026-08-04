import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import type { ContentDisplay } from '@/lib/app-settings'

export function CollapsibleMedia({
  display,
  summary,
  children,
}: {
  display: ContentDisplay
  summary: string
  children: React.ReactNode
}) {
  const [temporarilyExpanded, setTemporarilyExpanded] = useState(false)

  useEffect(() => {
    setTemporarilyExpanded(false)
  }, [display])

  if (display === 'expanded' || temporarilyExpanded) {
    return children
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="text-muted-foreground w-fit"
      onClick={(event) => {
        event.stopPropagation()
        setTemporarilyExpanded(true)
      }}
    >
      <Eye data-icon="inline-start" />
      {summary}，点击显示
    </Button>
  )
}
