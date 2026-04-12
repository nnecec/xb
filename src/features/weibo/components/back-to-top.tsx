import { useScroll } from '@reactuses/core'
import { ArrowUp } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BackToTopProps {
  /** 滚动容器引用，未提供时回退到 window */
  containerRef?: RefObject<HTMLElement | null>
  /** 显示按钮的阈值（滚动距离），默认 200px */
  threshold?: number
}

export function BackToTop({ containerRef, threshold = 200 }: BackToTopProps) {
  const [container, setContainer] = useState<HTMLElement | Window | null>(
    containerRef?.current ?? window,
  )

  useEffect(() => {
    setContainer(containerRef?.current ?? window)
  }, [containerRef])

  const [, scrollTop] = useScroll(container)
  const isVisible = scrollTop > threshold

  function scrollToTop() {
    if (container instanceof Window) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    container?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button
      size="icon"
      variant="outline"
      onClick={scrollToTop}
      title="返回顶部"
      className={cn(
        'absolute right-4 bottom-4 z-50 rounded-full border-border/70 bg-background/85 shadow-lg shadow-black/10 backdrop-blur transition-[opacity,transform,background-color] duration-200 motion-reduce:transition-none hover:bg-accent',
        isVisible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-2 opacity-0',
      )}
      aria-label="返回顶部"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  )
}
