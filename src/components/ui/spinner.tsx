import { Loader2 } from 'lucide-react'
import * as React from 'react'

import { cn } from '@/lib/utils'

interface SpinnerProps extends React.ComponentProps<'div'> {
  size?: 'sm' | 'md' | 'lg'
}

function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
  }

  return (
    <div
      data-slot="spinner"
      className={cn('flex items-center justify-center', className)}
      {...props}
    >
      <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
    </div>
  )
}

export { Spinner }
