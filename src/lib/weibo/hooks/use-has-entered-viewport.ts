import { useEffect, useState, type RefObject } from 'react'

/** Records the first time an element reaches the viewport without requiring browser-only APIs. */
export function useHasEnteredViewport<T extends Element>(ref: RefObject<T | null>) {
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || hasEnteredViewport || typeof IntersectionObserver !== 'function') {
      return
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        setHasEnteredViewport(true)
        observer.disconnect()
      }
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [hasEnteredViewport, ref])

  return hasEnteredViewport
}
