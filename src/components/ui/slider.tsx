import { Slider as SliderPrimitive } from 'radix-ui'
import * as React from 'react'

import { cn } from '@/lib/utils'

function Slider({
  className,
  'aria-label': ariaLabel,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        'relative flex w-full touch-none items-center select-none data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5 data-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="bg-muted relative h-1.5 w-full grow overflow-hidden rounded-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="bg-primary absolute h-full data-[orientation=vertical]:w-full"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        aria-label={ariaLabel}
        className="border-primary bg-background focus-visible:ring-ring/50 block size-4 shrink-0 rounded-full border shadow-xs transition-[box-shadow,transform] outline-none hover:scale-110 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50"
      />
    </SliderPrimitive.Root>
  )
}

export { Slider }
