import type { HTMLAttributes } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface BookmarkIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
}

const BookmarkIcon = forwardRef<HTMLDivElement, BookmarkIconProps>(
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
          <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
        </svg>
      </div>
    )
  },
)

BookmarkIcon.displayName = 'BookmarkIcon'

export { BookmarkIcon }
