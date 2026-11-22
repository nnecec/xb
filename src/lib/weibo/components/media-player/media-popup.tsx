import { PopoverCSSVars } from '@videojs/core'
import {
  getPositioningBoundaryRect,
  isEventWithinElement,
  resolvePositioningBoundary,
} from '@videojs/core/dom'
import type { PositioningCSSVars } from '@videojs/core/dom'
import { Popover, renderElement, usePopoverContext } from '@videojs/react'
import { getElementSize, getPositionedSide, resolveCSSLength } from '@videojs/utils/dom'
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

function getPositioningCSSVars(
  triggerRect: DOMRect,
  boundaryRect: DOMRect,
  side: ManualPopupStyleOptions['side'],
  offsets: ReturnType<typeof normalizeManualOffsets>,
  cssVars: PositioningCSSVars,
) {
  const vars: Record<string, string> = {}
  const boundaryStartX = boundaryRect.left + offsets.boundaryOffset
  const boundaryEndX = boundaryRect.right - offsets.boundaryOffset
  const boundaryStartY = boundaryRect.top + offsets.boundaryOffset
  const boundaryEndY = boundaryRect.bottom - offsets.boundaryOffset
  vars[cssVars.anchorWidth] = `${triggerRect.width}px`
  vars[cssVars.anchorHeight] = `${triggerRect.height}px`

  if (side === 'top' || side === 'bottom') {
    const sideSpace =
      side === 'top' ? triggerRect.top - boundaryStartY : boundaryEndY - triggerRect.bottom
    vars[cssVars.availableHeight] = `${Math.max(0, sideSpace - offsets.sideOffset)}px`
    vars[cssVars.availableWidth] = `${Math.max(0, boundaryEndX - boundaryStartX)}px`
  } else {
    const sideSpace =
      side === 'left' ? triggerRect.left - boundaryStartX : boundaryEndX - triggerRect.right
    vars[cssVars.availableWidth] = `${Math.max(0, sideSpace - offsets.sideOffset)}px`
    vars[cssVars.availableHeight] = `${Math.max(0, boundaryEndY - boundaryStartY)}px`
  }

  return vars
}

function getManualPositionStyle(
  triggerRect: DOMRect,
  popupRect: DOMRect,
  side: ManualPopupStyleOptions['side'],
  align: ManualPopupStyleOptions['align'],
  offsets: ReturnType<typeof normalizeManualOffsets>,
  boundaryRect: DOMRect,
) {
  const { sideOffset, alignOffset } = offsets
  let top: number | string = 0
  let bottom: string | undefined
  let left: number | string = 0
  let right: string | undefined

  if (side === 'top') bottom = `calc(100% - ${triggerRect.top}px + ${sideOffset}px)`
  else if (side === 'bottom') top = triggerRect.bottom + sideOffset
  else if (side === 'left') right = `calc(100% - ${triggerRect.left}px + ${sideOffset}px)`
  else left = triggerRect.right + sideOffset

  if (side === 'top' || side === 'bottom') {
    left =
      align === 'start'
        ? triggerRect.left + alignOffset
        : align === 'end'
          ? triggerRect.right - popupRect.width + alignOffset
          : triggerRect.left + (triggerRect.width - popupRect.width) / 2 + alignOffset
    left = Math.min(
      Math.max(left as number, boundaryRect.left + offsets.boundaryOffset),
      Math.max(
        boundaryRect.left + offsets.boundaryOffset,
        boundaryRect.right - offsets.boundaryOffset - popupRect.width,
      ),
    )
  } else {
    top =
      align === 'start'
        ? triggerRect.top + alignOffset
        : align === 'end'
          ? triggerRect.bottom - popupRect.height + alignOffset
          : triggerRect.top + (triggerRect.height - popupRect.height) / 2 + alignOffset
    top = Math.min(
      Math.max(top as number, boundaryRect.top + offsets.boundaryOffset),
      Math.max(
        boundaryRect.top + offsets.boundaryOffset,
        boundaryRect.bottom - offsets.boundaryOffset - popupRect.height,
      ),
    )
  }

  return {
    top: side === 'top' ? 'auto' : `${top}px`,
    bottom: bottom ?? 'auto',
    left: side === 'left' ? 'auto' : `${left}px`,
    right: right ?? 'auto',
  }
}

type PositioningOffsets = ReturnType<typeof normalizeManualOffsets>

function resolveOffsets(element: Element): PositioningOffsets {
  const computed = getComputedStyle(element)
  return {
    sideOffset: resolveCSSLength(element, computed.getPropertyValue(PopoverCSSVars.sideOffset)),
    alignOffset: resolveCSSLength(element, computed.getPropertyValue(PopoverCSSVars.alignOffset)),
    boundaryOffset: resolveCSSLength(
      element,
      computed.getPropertyValue(PopoverCSSVars.boundaryOffset),
    ),
  }
}

function getPopupPositionRect(element: HTMLElement, side: ManualPopupStyleOptions['side']) {
  const rect = element.getBoundingClientRect()
  const size = getElementSize(element, {
    box: 'layout',
    overflow: side === 'left' || side === 'right' ? 'width' : 'height',
  })
  return new DOMRect(rect.left, rect.top, size.width, size.height)
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
    ...getManualPositionStyle(triggerRect, popupRect, side, align, resolvedOffsets, boundaryRect),
    ...getPositioningCSSVars(triggerRect, boundaryRect, side, resolvedOffsets, cssVars),
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
