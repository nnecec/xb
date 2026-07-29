import { createContext, useContext } from 'react'

import { cn } from '@/lib/utils'

export const ImmersiveHeaderHiddenContext = createContext(false)

export function useImmersiveHeaderClassName(className: string) {
  const isHidden = useContext(ImmersiveHeaderHiddenContext)

  return cn(
    className,
    'transition-[transform,opacity] duration-200 ease-(--ease-out-strong) motion-reduce:transition-none',
    isHidden && 'pointer-events-none -translate-y-[calc(100%+1px)] opacity-0',
  )
}
