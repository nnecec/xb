import type { HTMLAttributes } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface CompassIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
}

const CompassIcon = forwardRef<HTMLDivElement, CompassIconProps>(
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
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      </div>
    )
  },
)

CompassIcon.displayName = 'CompassIcon'

export { CompassIcon }
