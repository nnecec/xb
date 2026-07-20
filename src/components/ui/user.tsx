import type { HTMLAttributes } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface UserIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
}

const UserIcon = forwardRef<HTMLDivElement, UserIconProps>(
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
          <circle cx="12" cy="8" r="5" />
          <path d="M20 21a8 8 0 0 0-16 0" />
        </svg>
      </div>
    )
  },
)

UserIcon.displayName = 'UserIcon'

export { UserIcon }
