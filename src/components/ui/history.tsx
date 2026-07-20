import type { HTMLAttributes } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface HistoryIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
}

const HistoryIcon = forwardRef<HTMLDivElement, HistoryIconProps>(
  ({ className, size = 28, ...props }, ref) => {
    return (
      <div ref={ref} className={cn(className)} {...props}>
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
          <line x1="12" x2="12" y1="12" y2="7" />
          <line x1="12" x2="16" y1="12" y2="14" />
        </svg>
      </div>
    )
  },
)

HistoryIcon.displayName = 'HistoryIcon'

export { HistoryIcon }
