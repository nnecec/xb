import type { HTMLAttributes } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface BellIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
}

const BellIcon = forwardRef<HTMLDivElement, BellIconProps>(
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
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </div>
    )
  },
)

BellIcon.displayName = 'BellIcon'

export { BellIcon }
