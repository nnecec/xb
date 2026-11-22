import { describe, expect, it } from 'vitest'

import { forwardBlankAreaWheelToMainColumn } from '@/lib/weibo/workspace/blank-area-wheel'

function wheel(target: Element, init: WheelEventInit): WheelEvent {
  const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, ...init })
  target.dispatchEvent(event)
  return event
}

function scrollableMain() {
  const main = document.createElement('div')
  Object.defineProperty(main, 'scrollHeight', { configurable: true, value: 800 })
  Object.defineProperty(main, 'clientHeight', { configurable: true, value: 200 })
  main.scrollTop = 40
  return main
}

describe('forwardBlankAreaWheelToMainColumn', () => {
  it('scrolls the main column from blank workspace space', () => {
    const boundary = document.createElement('div')
    const gutter = document.createElement('div')
    const main = scrollableMain()
    boundary.append(gutter, main)
    boundary.addEventListener('wheel', (event) => {
      forwardBlankAreaWheelToMainColumn(event, boundary, main)
    })

    const event = wheel(gutter, { deltaY: 25 })

    expect(event.defaultPrevented).toBe(true)
    expect(main.scrollTop).toBe(65)
  })

  it('keeps wheel events inside a column on that column', () => {
    const boundary = document.createElement('div')
    const column = document.createElement('section')
    column.dataset.auxiliaryColumn = 'topic'
    const card = document.createElement('div')
    column.append(card)
    const main = scrollableMain()
    boundary.append(column, main)
    boundary.addEventListener('wheel', (event) => {
      forwardBlankAreaWheelToMainColumn(event, boundary, main)
    })

    const event = wheel(card, { deltaY: 25 })

    expect(event.defaultPrevented).toBe(false)
    expect(main.scrollTop).toBe(40)
  })

  it('keeps a scrollable rail on its own scroller', () => {
    const boundary = document.createElement('div')
    const rail = document.createElement('aside')
    rail.style.overflowY = 'auto'
    Object.defineProperty(rail, 'scrollHeight', { configurable: true, value: 900 })
    Object.defineProperty(rail, 'clientHeight', { configurable: true, value: 400 })
    const blank = document.createElement('div')
    rail.append(blank)
    const main = scrollableMain()
    boundary.append(rail, main)
    boundary.addEventListener('wheel', (event) => {
      forwardBlankAreaWheelToMainColumn(event, boundary, main)
    })

    const event = wheel(blank, { deltaY: 25 })

    expect(event.defaultPrevented).toBe(false)
    expect(main.scrollTop).toBe(40)
  })

  it('scrolls the main column from a rail that has no overflow', () => {
    const boundary = document.createElement('div')
    const rail = document.createElement('aside')
    rail.style.overflowY = 'auto'
    Object.defineProperty(rail, 'scrollHeight', { configurable: true, value: 400 })
    Object.defineProperty(rail, 'clientHeight', { configurable: true, value: 400 })
    const blank = document.createElement('div')
    rail.append(blank)
    const main = scrollableMain()
    boundary.append(rail, main)
    boundary.addEventListener('wheel', (event) => {
      forwardBlankAreaWheelToMainColumn(event, boundary, main)
    })

    wheel(blank, { deltaY: 10 })

    expect(main.scrollTop).toBe(50)
  })

  it('leaves horizontal and zoom gestures alone', () => {
    const boundary = document.createElement('div')
    const gutter = document.createElement('div')
    const main = scrollableMain()
    boundary.append(gutter, main)
    boundary.addEventListener('wheel', (event) => {
      forwardBlankAreaWheelToMainColumn(event, boundary, main)
    })

    wheel(gutter, { deltaX: 30, deltaY: 4 })
    wheel(gutter, { deltaY: 20, shiftKey: true })
    wheel(gutter, { deltaY: 20, ctrlKey: true })

    expect(main.scrollTop).toBe(40)
  })

  it('converts line deltas and clamps at the column edges', () => {
    const boundary = document.createElement('div')
    const gutter = document.createElement('div')
    const main = scrollableMain()
    main.scrollTop = 590
    boundary.append(gutter, main)
    boundary.addEventListener('wheel', (event) => {
      forwardBlankAreaWheelToMainColumn(event, boundary, main)
    })

    wheel(gutter, { deltaY: 2, deltaMode: WheelEvent.DOM_DELTA_LINE })

    expect(main.scrollTop).toBe(600)

    const upward = wheel(gutter, { deltaY: -4000 })
    expect(upward.defaultPrevented).toBe(true)
    expect(main.scrollTop).toBe(0)
  })
})
