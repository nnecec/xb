import { notifyManager } from '@tanstack/query-core'
import '@testing-library/jest-dom/vitest'

if (!globalThis.IntersectionObserver) {
  globalThis.IntersectionObserver = class {
    readonly root = null
    readonly rootMargin = ''
    readonly thresholds = []
    disconnect() {}
    observe() {}
    unobserve() {}
    takeRecords() {
      return []
    }
  } as unknown as typeof IntersectionObserver
}
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Avoid setTimeout(0) batches firing after Vitest tears down jsdom (window is not defined).
notifyManager.setScheduler((run) => {
  run()
})

// Automatically unmount and cleanup DOM after each test
afterEach(() => {
  cleanup()
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

Object.defineProperty(globalThis, 'browser', {
  writable: true,
  configurable: true,
  value: {
    runtime: {
      getManifest: () => ({ version: '0.0.0-test' }),
    },
  },
})

class TestResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: TestResizeObserver,
})
