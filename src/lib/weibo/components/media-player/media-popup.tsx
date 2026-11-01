import { PopoverCSSVars } from '@videojs/core'
import {
  getManualPositionStyle,
  getPopupPositionRect,
  getPositionedSide,
  getPositioningBoundaryRect,
  getPositioningCSSVars,
  isEventWithinElement,
  resolveOffsets,
  resolvePositioningBoundary,
} from '@videojs/core/dom'
import type { PositioningCSSVars } from '@videojs/core/dom'
import { Popover, renderElement, usePopoverContext } from '@videojs/react'
import type { ComponentProps, ForwardedRef, ReactElement } from 'react'
import { forwardRef, useCallback, useLayoutEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'

import { getUiPortalContainer } from '@/components/ui/portal'

const POPUP_RESET_STYLE = {
  position: 'fixed',
  inset: 'auto',
  margin: 0,
} as const

const MEDIA_POPUP_HOST_CLASS_NAME = 'media-default-skin media-default-skin--video'

interface ManualPopupStyleOptions {
  triggerRect: DOMRect
  popupRect: DOMRect
  boundaryRect: DOMRect
  side: 'top' | 'bottom' | 'left' | 'right'
  align: 'start' | 'center' | 'end'
  offsets: {
    sideOffset: number
    alignOffset: number
    boundaryOffset?: number
  }
  cssVars: PositioningCSSVars
}

function normalizeManualOffsets(offsets: ManualPopupStyleOptions['offsets']) {
  return {
    sideOffset: offsets.sideOffset,
    alignOffset: offsets.alignOffset,
    boundaryOffset: offsets.boundaryOffset ?? 0,
  }
}

function getPopupRoot(node: Node) {
  const root = node.getRootNode()
  return root instanceof ShadowRoot || root instanceof Document ? root : document
}

export function buildManualPopupStyle({
  triggerRect,
  popupRect,
  boundaryRect,
  side,
  align,
  offsets,
  cssVars,
}: ManualPopupStyleOptions) {
  const resolvedOffsets = normalizeManualOffsets(offsets)

  return {
    ...getManualPositionStyle(
      triggerRect,
      popupRect,
      { side, align },
      resolvedOffsets,
      boundaryRect,
    ),
    ...getPositioningCSSVars(triggerRect, boundaryRect, { side, align }, resolvedOffsets, cssVars),
    ...POPUP_RESET_STYLE,
  }
}

function getMediaPopupPortalContainer() {
  return getUiPortalContainer() as Element | DocumentFragment | undefined
}

function renderInMediaPopupHost(node: ReactElement | null) {
  if (!node) {
    return null
  }

  const container = getMediaPopupPortalContainer()
  if (!container) {
    return node
  }

  return createPortal(
    <div className={MEDIA_POPUP_HOST_CLASS_NAME} style={{ display: 'contents' }}>
      {node}
    </div>,
    container,
  )
}

function ManualPopoverPopup(
  { render, className, style, ...elementProps }: ComponentProps<typeof Popover.Popup>,
  forwardedRef: ForwardedRef<HTMLDivElement>,
) {
  const {
    core,
    popover,
    state,
    preferredSide,
    setPositionedSide,
    stateAttrMap,
    popupId,
    boundary,
    container,
  } = usePopoverContext()
  const [popupElement, setPopupElement] = useState<HTMLDivElement | null>(null)
  const setPopupNode = useCallback(
    (element: HTMLDivElement | null) => {
      setPopupElement(element)
      popover.setPopupElement(element)
    },
    [popover],
  )

  useLayoutEffect(() => {
    if (typeof forwardedRef === 'function') {
      forwardedRef(popupElement)
      return
    }
    if (forwardedRef) forwardedRef.current = popupElement
  }, [forwardedRef, popupElement])
  const positionOptions = useMemo(
    () => ({
      side: preferredSide,
      align: state.align,
    }),
    [preferredSide, state.align],
  )
  const [measuredStyle, setMeasuredStyle] = useState<Record<string, string | number> | null>(null)
  const manualStyle = state.open ? measuredStyle : null

  useLayoutEffect(() => {
    if (!state.open) return

    function measure() {
      const triggerElement = popover.triggerElement
      if (!triggerElement || !popupElement) return

      const triggerRect = triggerElement.getBoundingClientRect()
      const boundaryElement = resolvePositioningBoundary(boundary, {
        container,
        root: getPopupRoot(popupElement),
      })
      const boundaryRect = getPositioningBoundaryRect(boundaryElement)
      const popupRect = getPopupPositionRect(popupElement, positionOptions.side)
      const offsets = resolveOffsets(popupElement)
      const side = getPositionedSide(triggerRect, popupRect, boundaryRect, positionOptions, offsets)

      setMeasuredStyle(
        buildManualPopupStyle({
          triggerRect,
          popupRect,
          boundaryRect,
          side,
          align: positionOptions.align,
          offsets,
          cssVars: PopoverCSSVars,
        }),
      )
      setPositionedSide(side)
    }

    measure()

    const triggerElement = popover.triggerElement
    const boundaryElement = popupElement
      ? resolvePositioningBoundary(boundary, {
          container,
          root: getPopupRoot(popupElement),
        })
      : null

    let rafId = 0
    function reposition(event?: Event) {
      if (event && isEventWithinElement(event, popupElement)) return
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(measure)
    }

    reposition()

    const resizeObserver =
      typeof ResizeObserver === 'function'
        ? new ResizeObserver(() => {
            reposition()
          })
        : null

    if (triggerElement && resizeObserver) resizeObserver.observe(triggerElement)
    if (popupElement && resizeObserver) resizeObserver.observe(popupElement)
    if (boundaryElement && resizeObserver) resizeObserver.observe(boundaryElement)

    window.addEventListener('scroll', reposition, { capture: true, passive: true })
    window.addEventListener('resize', reposition)

    return () => {
      cancelAnimationFrame(rafId)
      resizeObserver?.disconnect()
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [state.open, popover, boundary, container, positionOptions, popupElement, setPositionedSide])

  if (!state.open) return null

  const { onFocusOut, ...restPopupProps } = popover.popupProps
  const popup = renderElement(
    'div',
    {
      render,
      className,
      style,
    },
    {
      state,
      stateAttrMap,
      ref: setPopupNode,
      props: [
        {
          id: popupId,
          style: manualStyle ?? POPUP_RESET_STYLE,
          ...core.getPopupAttrs(state),
        },
        {
          ...restPopupProps,
          onBlur: onFocusOut,
        },
        elementProps,
      ],
    },
  )

  return renderInMediaPopupHost(popup)
}

export const MediaPopoverPopup = forwardRef(ManualPopoverPopup)
