import type { SVGAttributes } from 'react'
import { forwardRef } from 'react'

import { cn } from '@/lib/utils'

interface RefreshCWIconProps extends SVGAttributes<SVGSVGElement> {
  size?: number
}

const RefreshCWIcon = forwardRef<SVGSVGElement, RefreshCWIconProps>(
  ({ className, size = 24, ...props }, ref) => {
    return (
      <svg
        ref={ref}
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
        className={cn('shrink-0', className)}
        {...props}
      >
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </svg>
    )
  },
)

RefreshCWIcon.displayName = 'RefreshCWIcon'

export { RefreshCWIcon }
