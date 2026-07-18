import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getRemoteFontConfig,
  getRemoteFontFamilyName,
  isRemoteFont,
  loadFont,
  REMOTE_FONT_OPTIONS,
  resetFontLoaderStateForTests,
  resolveFontFamilyStack,
} from './font-loader'

describe('font-loader', () => {
  beforeEach(() => {
    resetFontLoaderStateForTests()
    document.head.innerHTML = ''
  })

  afterEach(() => {
    resetFontLoaderStateForTests()
    document.head.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('identifies remote vs system fonts', () => {
    expect(isRemoteFont('font-lxgw-wenkai')).toBe(true)
    expect(isRemoteFont('font-sans')).toBe(false)
    expect(isRemoteFont('font-simsun')).toBe(false)
  })

  it('resolves font-family stacks aligned with tokens', () => {
    expect(resolveFontFamilyStack('font-simsun')).toContain('SimSun')
    expect(resolveFontFamilyStack('font-source-han-sans')).toContain('Noto Sans SC')
    expect(resolveFontFamilyStack('font-lxgw-wenkai')).toContain('LXGW WenKai')
    expect(resolveFontFamilyStack('font-sans')).toContain('system-ui')
  })

  it('keeps family names aligned with known tokens', () => {
    expect(getRemoteFontFamilyName('font-source-han-serif')).toBe('Noto Serif SC')
    expect(getRemoteFontFamilyName('font-source-han-sans')).toBe('Noto Sans SC')
    expect(getRemoteFontFamilyName('font-fz-kai')).toBe('FZKai-Z03')
    expect(getRemoteFontFamilyName('font-lxgw-marker-gothic')).toBe('LXGW Marker Gothic')
    expect(getRemoteFontFamilyName('font-misans')).toBe('MiSans')
    expect(getRemoteFontFamilyName('font-harmonyos-sans')).toBe('HarmonyOS Sans SC')
    expect(getRemoteFontFamilyName('font-lxgw-neo-xihei')).toBe('LXGW Neo XiHei')
    expect(getRemoteFontFamilyName('font-lxgw-wenkai-screen')).toBe('LXGW WenKai Screen')
    expect(getRemoteFontFamilyName('font-jixiang-song')).toBe('Fontquan-XinYiJiXiangSong')
    expect(getRemoteFontFamilyName('font-dingtalk-jinbu')).toBe('DingTalk JinBuTi')
  })

  it('uses correct format for single-file fonts', () => {
    const zhuque = getRemoteFontConfig('font-zhuque')
    expect(zhuque.kind).toBe('single')
    if (zhuque.kind === 'single') {
      expect(zhuque.format).toBe('truetype')
      expect(zhuque.url.endsWith('.ttf')).toBe(true)
    }

    const wenkai = getRemoteFontConfig('font-lxgw-wenkai')
    expect(wenkai.kind).toBe('single')
    if (wenkai.kind === 'single') {
      expect(wenkai.format).toBe('woff2')
    }
  })

  it('uses stylesheet sources for split CJK fonts', () => {
    const fz = getRemoteFontConfig('font-fz-kai')
    expect(fz.kind).toBe('stylesheet')
    if (fz.kind === 'stylesheet') {
      expect(fz.stylesheetUrl).toContain('font.css')
    }

    const marker = getRemoteFontConfig('font-lxgw-marker-gothic')
    expect(marker.kind).toBe('stylesheet')
    if (marker.kind === 'stylesheet') {
      expect(marker.stylesheetUrl).toContain('lxgw-marker-gothic.css')
    }

    const misans = getRemoteFontConfig('font-misans')
    expect(misans.kind).toBe('stylesheet')
    if (misans.kind === 'stylesheet') {
      expect(misans.stylesheetUrl).toContain('misans-regular')
    }

    const harmony = getRemoteFontConfig('font-harmonyos-sans')
    expect(harmony.kind).toBe('stylesheet')
  })

  it('lists remote fonts without size copy and no canger entry', () => {
    const values = REMOTE_FONT_OPTIONS.map((o) => o.value)
    expect(values).not.toContain('font-canger-jinkai' as never)
    expect(REMOTE_FONT_OPTIONS.every((o) => o.label && o.group)).toBe(true)
    expect(values).toContain('font-misans')
    expect(values).toContain('font-harmonyos-sans')
    expect(values).toContain('font-lxgw-neo-xihei')
    expect(values).toContain('font-lxgw-wenkai-screen')
    expect(values).toContain('font-jixiang-song')
    expect(values).toContain('font-dingtalk-jinbu')
    expect(REMOTE_FONT_OPTIONS.filter((o) => o.group === 'sans').length).toBeGreaterThan(0)
    expect(REMOTE_FONT_OPTIONS.filter((o) => o.group === 'serif').length).toBeGreaterThan(0)
  })

  it('loads single-file font via FontFace API', async () => {
    const load = vi.fn().mockResolvedValue({ family: 'LXGW WenKai' })
    const add = vi.fn()
    const check = vi.fn().mockReturnValue(true)
    const fontsLoad = vi.fn().mockResolvedValue([])

    class MockFontFace {
      family: string
      load = load
      constructor(family: string) {
        this.family = family
      }
    }

    vi.stubGlobal('FontFace', MockFontFace)
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        add,
        check,
        load: fontsLoad,
        ready: Promise.resolve(),
        [Symbol.iterator]: function* () {},
      },
    })

    const ok = await loadFont('font-lxgw-wenkai')
    expect(ok).toBe(true)
    expect(load).toHaveBeenCalled()
    expect(add).toHaveBeenCalled()
    expect(document.getElementById('xb-font-font-lxgw-wenkai')).toBeTruthy()
  })

  it('loads stylesheet fonts via link element', async () => {
    const check = vi.fn().mockReturnValue(true)
    const fontsLoad = vi.fn().mockResolvedValue([])
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        add: vi.fn(),
        check,
        load: fontsLoad,
        ready: Promise.resolve(),
        [Symbol.iterator]: function* () {},
      },
    })

    const promise = loadFont('font-fz-kai')
    // Wait a tick for link to be created
    await Promise.resolve()
    const link = document.getElementById('xb-font-font-fz-kai') as HTMLLinkElement | null
    expect(link).toBeTruthy()
    expect(link?.rel).toBe('stylesheet')
    link?.dispatchEvent(new Event('load'))
    await expect(promise).resolves.toBe(true)
  })

  it('dedupes concurrent load calls', async () => {
    const load = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ family: 'Noto Sans SC' }), 20)),
      )
    class MockFontFace {
      family: string
      load = load
      constructor(family: string) {
        this.family = family
      }
    }
    vi.stubGlobal('FontFace', MockFontFace)
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        add: vi.fn(),
        check: () => true,
        load: vi.fn().mockResolvedValue([]),
        ready: Promise.resolve(),
        [Symbol.iterator]: function* () {},
      },
    })

    const [a, b] = await Promise.all([
      loadFont('font-source-han-sans'),
      loadFont('font-source-han-sans'),
    ])
    expect(a).toBe(true)
    expect(b).toBe(true)
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('returns false and cleans up on FontFace failure', async () => {
    class MockFontFace {
      load = vi.fn().mockRejectedValue(new Error('network'))
      constructor(public family: string) {}
    }
    vi.stubGlobal('FontFace', MockFontFace)
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: {
        add: vi.fn(),
        check: () => false,
        load: vi.fn().mockRejectedValue(new Error('fail')),
        ready: Promise.resolve(),
        [Symbol.iterator]: function* () {},
      },
    })

    const ok = await loadFont('font-smiley-sans')
    expect(ok).toBe(false)
    expect(document.getElementById('xb-font-font-smiley-sans')).toBeNull()
  })
})
