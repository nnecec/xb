import { PopoverCSSVars, TooltipCSSVars } from '@videojs/core'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildManualPopupStyle } from './media-popup'

const originalCss = globalThis.CSS

describe('buildManualPopupStyle', () => {
  afterEach(() => {
    globalThis.CSS = originalCss
  })

  it('always returns viewport-based manual positioning even when anchor positioning is supported', () => {
    globalThis.CSS = {
      supports: vi.fn(() => true),
    } as unknown as typeof CSS

    const style = buildManualPopupStyle({
      triggerRect: {
        top: 90,
        right: 160,
        bottom: 108,
        left: 120,
        width: 40,
        height: 18,
      } as DOMRect,
      popupRect: {
        width: 96,
        height: 32,
      } as DOMRect,
      boundaryRect: {
        top: 0,
        right: 400,
        bottom: 300,
        left: 0,
        width: 400,
        height: 300,
      } as DOMRect,
      side: 'top',
      align: 'start',
      offsets: {
        sideOffset: 12,
        alignOffset: 20,
        boundaryOffset: 0,
      },
      cssVars: PopoverCSSVars,
    })

    expect(style).toMatchObject({
      position: 'fixed',
      inset: 'auto',
      margin: 0,
      top: 'auto',
      bottom: 'calc(100% - 90px + 12px)',
      left: '140px',
      [PopoverCSSVars.anchorWidth]: '40px',
      [PopoverCSSVars.anchorHeight]: '18px',
      [PopoverCSSVars.availableWidth]: '400px',
      [PopoverCSSVars.availableHeight]: '78px',
    })
    expect(style).not.toHaveProperty('positionAnchor')
  })

  it('computes tooltip alignment using the same manual path', () => {
    const style = buildManualPopupStyle({
      triggerRect: {
        top: 40,
        right: 140,
        bottom: 72,
        left: 100,
        width: 40,
        height: 32,
      } as DOMRect,
      popupRect: {
        width: 80,
        height: 24,
      } as DOMRect,
      boundaryRect: {
        top: 0,
        right: 320,
        bottom: 240,
        left: 0,
        width: 320,
        height: 240,
      } as DOMRect,
      side: 'right',
      align: 'center',
      offsets: {
        sideOffset: 8,
        alignOffset: 6,
        boundaryOffset: 0,
      },
      cssVars: TooltipCSSVars,
    })

    expect(style).toMatchObject({
      top: '50px',
      left: '148px',
      [TooltipCSSVars.anchorWidth]: '40px',
      [TooltipCSSVars.anchorHeight]: '32px',
      [TooltipCSSVars.availableWidth]: '172px',
      [TooltipCSSVars.availableHeight]: '240px',
    })
  })
})
