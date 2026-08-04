import { useScroll } from '@reactuses/core'
import { ArrowUp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BackToTopProps {
  /**
   * 滚动容器（由父级在 ref callback 中传入，避免子树在 ref 挂载前读不到元素）。
   * 未提供或非 HTMLElement 时回退到 window。
   */
  scrollRoot?: HTMLElement | Window | null
  /** 显示按钮的阈值（滚动距离），默认 200px */
  threshold?: number
}

export function BackToTop({ scrollRoot, threshold = 200 }: BackToTopProps) {
  const target =
    scrollRoot instanceof HTMLElement || scrollRoot instanceof Window ? scrollRoot : window
  const [, scrollTop] = useScroll(target)
  const isVisible = scrollTop > threshold

  function scrollToTop() {
    if (target instanceof Window) {
      target.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    target.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Button
      size="icon"
      variant="outline"
      onClick={scrollToTop}
      title="返回顶部"
      className={cn(
        'fixed right-4 bottom-4 z-50 rounded-full border-border/70 bg-background/85 shadow-lg shadow-black/10 backdrop-blur transition-[opacity,transform,background-color] duration-250 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none hover:bg-accent',
        isVisible
          ? 'pointer-events-auto translate-y-0 opacity-100'
          : 'pointer-events-none translate-y-3 opacity-0',
      )}
      aria-label="返回顶部"
    >
      <ArrowUp className="h-4 w-4" />
    </Button>
  )
}
