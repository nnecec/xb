import { type RefObject, useLayoutEffect, useRef } from 'react'

import { getUiPortalContainer } from '@/components/ui/portal'

const INLINE_FULLSCREEN_CLASS_NAME = 'media-inline-fullscreen'

interface InlineFullscreenSession {
  deactivate: () => void
}

export function activateInlineFullscreen(
  fullscreenElement: HTMLElement,
  onExit: () => void,
): InlineFullscreenSession {
  const originalParent = fullscreenElement.parentNode
  const originalNextSibling = fullscreenElement.nextSibling
  const placeholder = document.createComment('xb-inline-fullscreen-placeholder')
  const portalContainer = getUiPortalContainer()

  let restored = false

  if (
    originalParent &&
    portalContainer &&
    portalContainer !== originalParent &&
    !fullscreenElement.contains(portalContainer)
  ) {
    originalParent.insertBefore(placeholder, originalNextSibling)
    portalContainer.appendChild(fullscreenElement)
  }

  fullscreenElement.classList.add(INLINE_FULLSCREEN_CLASS_NAME)
  fullscreenElement.setAttribute('data-xb-inline-fullscreen', 'true')

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onExit()
    }
  }

  window.addEventListener('keydown', handleKeyDown)

  return {
    deactivate() {
      if (restored) {
        return
      }

      restored = true
      window.removeEventListener('keydown', handleKeyDown)
      fullscreenElement.classList.remove(INLINE_FULLSCREEN_CLASS_NAME)
      fullscreenElement.removeAttribute('data-xb-inline-fullscreen')

      if (!originalParent) {
        placeholder.remove()
        return
      }

      if (placeholder.parentNode === originalParent) {
        originalParent.insertBefore(fullscreenElement, placeholder)
        placeholder.remove()
        return
      }

      if (originalNextSibling?.parentNode === originalParent) {
        originalParent.insertBefore(fullscreenElement, originalNextSibling)
        return
      }

      if (fullscreenElement.parentNode !== originalParent) {
        originalParent.appendChild(fullscreenElement)
      }
    },
  }
}

export function useInlineFullscreen(
  mediaRef: RefObject<Element | null>,
  active: boolean,
  onExit: () => void,
) {
  const onExitRef = useRef(onExit)

  useLayoutEffect(() => {
    onExitRef.current = onExit
  }, [onExit])

  useLayoutEffect(() => {
    if (!active) {
      return
    }

    const container = mediaRef.current?.closest<HTMLElement>('.media-default-skin--video')
    if (!container) {
      return
    }

    const session = activateInlineFullscreen(container, () => onExitRef.current())
    return () => session.deactivate()
  }, [active, mediaRef])
}
