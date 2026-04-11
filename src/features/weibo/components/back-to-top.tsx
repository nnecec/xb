import { useScroll } from '@reactuses/core'
import { ArrowUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BackToTopProps {
  /** 滚动容器，默认为 window */
  container?: HTMLElement | null
  /** 显示按钮的阈值（滚动距离），默认 200px */
  threshold?: number
}

export function BackToTop({ container, threshold = 200 }: BackToTopProps) {
  const [, scrollTop] = useScroll(container)

  function scrollToTop() {
    console.log('🚀 ~ scrollToTop ~ container:', container)
    container?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button
      size="icon"
      variant="outline"
      onClick={scrollToTop}
      className={cn([
        scrollTop > threshold ? 'pointer-events-auto opacity-100' : 'opacity-0 pointer-events-none',
        'absolute bottom-4 right-4 z-50 rounded-full shadow-lg shadow-black/10 backdrop-blur bg-background/80 hover:bg-accent',
      ])}
      aria-label="返回顶部"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  )
}
