import type { FontFamilyClass } from './app-settings'

export type SystemFontFamily =
  | 'font-sans'
  | 'font-serif'
  | 'font-simsun'
  | 'font-fangsong'
  | 'font-simhei'
  | 'font-kaiti'

const remoteFonts = [
  // 无衬线 · 屏幕阅读
  'font-misans',
  'font-harmonyos-sans',
  'font-lxgw-neo-xihei',
  'font-source-han-sans',
  'font-lxgw-marker-gothic',
  'font-dingtalk-jinbu',
  'font-smiley-sans',
  // 衬线 / 楷体 · 长文阅读
  'font-lxgw-wenkai-screen',
  'font-lxgw-wenkai',
  'font-lxgw-neo-zhisong',
  'font-source-han-serif',
  'font-jixiang-song',
  'font-zhuque',
  'font-fz-kai',
] as const

/** 可下载开源字体 */
export type RemoteFontFamily = (typeof remoteFonts)[number]

type FontFormat = 'woff2' | 'truetype'

type SingleSourceFont = {
  kind: 'single'
  family: string
  url: string
  format: FontFormat
}

type StylesheetFont = {
  kind: 'stylesheet'
  family: string
  /** 含 unicode-range 分片的完整 CSS */
  stylesheetUrl: string
}

type RemoteFontConfig = SingleSourceFont | StylesheetFont

/**
 * 远程字体源。
 * - single：单文件，用 FontFace 加载
 * - stylesheet：unicode-range 分片 CSS（按需拉取字形）
 * family 必须与 global.css 中 --font-* token 一致
 *
 * 远程文件多为 Regular(400)；设置页仍允许调节粗细，由浏览器合成字重。
 */
const REMOTE_FONTS: Record<RemoteFontFamily, RemoteFontConfig> = {
  'font-misans': {
    kind: 'stylesheet',
    family: 'MiSans',
    stylesheetUrl:
      'https://cdn.jsdelivr.net/npm/misans-webfont@4.3.1/misans/misans-regular/result.css',
  },
  'font-harmonyos-sans': {
    kind: 'stylesheet',
    family: 'HarmonyOS Sans SC',
    stylesheetUrl:
      'https://cdn.jsdelivr.net/npm/harmonyos-sans-sc-webfont-splitted@1.1.0/dist/Regular.css',
  },
  'font-lxgw-neo-xihei': {
    kind: 'stylesheet',
    family: 'LXGW Neo XiHei',
    stylesheetUrl:
      'https://cdn.jsdelivr.net/npm/cn-fontsource-lxgw-neo-xi-hei-regular@1.0.1/font.css',
  },
  'font-source-han-sans': {
    kind: 'single',
    family: 'Noto Sans SC',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-sc@5.1.0/files/noto-sans-sc-chinese-simplified-400-normal.woff2',
    format: 'woff2',
  },
  'font-lxgw-marker-gothic': {
    kind: 'stylesheet',
    family: 'LXGW Marker Gothic',
    stylesheetUrl:
      'https://cdn.jsdelivr.net/npm/@free-fonts/lxgw-marker-gothic@1.0.0/lxgw-marker-gothic.css',
  },
  'font-dingtalk-jinbu': {
    kind: 'stylesheet',
    family: 'DingTalk JinBuTi',
    stylesheetUrl:
      'https://cdn.jsdelivr.net/npm/cn-fontsource-ding-talk-jin-bu-ti-regular@1.0.3/font.css',
  },
  'font-smiley-sans': {
    kind: 'single',
    family: 'Smiley Sans',
    url: 'https://cdn.jsdelivr.net/npm/font-smiley-sans@1.0.0/SmileySans-Oblique.otf.woff2',
    format: 'woff2',
  },
  'font-lxgw-wenkai-screen': {
    kind: 'stylesheet',
    // 屏幕阅读版：Regular 更饱满，长文更易读
    family: 'LXGW WenKai Screen',
    stylesheetUrl: 'https://cdn.jsdelivr.net/npm/cn-fontsource-lxgw-wen-kai-screen@1.0.6/font.css',
  },
  'font-lxgw-wenkai': {
    kind: 'single',
    family: 'LXGW WenKai',
    url: 'https://cdn.jsdelivr.net/npm/lxgwwenkai@1.0.1/woff2/LXGWWenKai-Regular.woff2',
    format: 'woff2',
  },
  'font-lxgw-neo-zhisong': {
    kind: 'single',
    family: 'LXGW Neo ZhiSong',
    url: 'https://cdn.jsdelivr.net/npm/lxgw-neo-zhisong-webfont@1.0.0/fonts/LXGWNeoZhiSong.woff2',
    format: 'woff2',
  },
  'font-source-han-serif': {
    kind: 'single',
    family: 'Noto Serif SC',
    url: 'https://cdn.jsdelivr.net/npm/@fontsource/noto-serif-sc@5.2.9/files/noto-serif-sc-chinese-simplified-400-normal.woff2',
    format: 'woff2',
  },
  'font-jixiang-song': {
    kind: 'stylesheet',
    family: 'Fontquan-XinYiJiXiangSong',
    stylesheetUrl:
      'https://cdn.jsdelivr.net/npm/cn-fontsource-fontquan-xin-yi-ji-xiang-song-regular@1.0.7/font.css',
  },
  'font-zhuque': {
    kind: 'single',
    family: 'ZhuQue Fangsong',
    // 上游仅提供 TTF；声明 truetype，避免 woff2 伪 format
    url: 'https://cdn.jsdelivr.net/npm/@fontpkg/zhuque-fangsong-technical-preview@0.212.0/ZhuqueFangsong-Regular.ttf',
    format: 'truetype',
  },
  'font-fz-kai': {
    kind: 'stylesheet',
    family: 'FZKai-Z03',
    stylesheetUrl: 'https://cdn.jsdelivr.net/npm/cn-fontsource-fz-kai-z-03-regular@1.0.1/font.css',
  },
}

const fontElementMap = new Map<RemoteFontFamily, HTMLStyleElement | HTMLLinkElement>()
const loadPromises = new Map<RemoteFontFamily, Promise<boolean>>()

export function isRemoteFont(font: FontFamilyClass): font is RemoteFontFamily {
  return (remoteFonts as readonly string[]).includes(font)
}

export function getRemoteFontConfig(font: RemoteFontFamily): RemoteFontConfig {
  return REMOTE_FONTS[font]
}

export function getRemoteFontFamilyName(font: RemoteFontFamily): string {
  return REMOTE_FONTS[font].family
}

/**
 * 解析 `font-*` class 对应的 CSS font-family 栈。
 * 与 global.css 中 --font-* token 保持一致；用于 shell 层注入。
 */
const FONT_FAMILY_STACKS: Record<FontFamilyClass, string> = {
  'font-sans':
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  'font-serif':
    'ui-serif, Georgia, Cambria, "Times New Roman", Times, "Songti SC", "Noto Serif SC", serif',
  'font-simsun': 'SimSun, STSong, 宋体, serif',
  'font-fangsong': 'FangSong, STFangSong, 仿宋, serif',
  'font-simhei': 'SimHei, STHeiti, 黑体, sans-serif',
  'font-kaiti': 'KaiTi, "KaiTi SC", STKaiti, 楷体, serif',
  'font-misans': "'MiSans', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
  'font-harmonyos-sans': "'HarmonyOS Sans SC', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
  'font-lxgw-neo-xihei': "'LXGW Neo XiHei', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
  'font-source-han-sans': "'Noto Sans SC', 'Source Han Sans SC', 'PingFang SC', sans-serif",
  'font-lxgw-marker-gothic': "'LXGW Marker Gothic', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
  'font-dingtalk-jinbu': "'DingTalk JinBuTi', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
  'font-smiley-sans': "'Smiley Sans', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
  'font-lxgw-wenkai-screen': "'LXGW WenKai Screen', 'LXGW WenKai', 'PingFang SC', sans-serif",
  'font-lxgw-wenkai': "'LXGW WenKai', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
  'font-lxgw-neo-zhisong': "'LXGW Neo ZhiSong', 'Songti SC', serif",
  'font-source-han-serif': "'Noto Serif SC', 'Source Han Serif SC', 'Songti SC', serif",
  'font-jixiang-song': "'Fontquan-XinYiJiXiangSong', 'Songti SC', serif",
  'font-zhuque': "'ZhuQue Fangsong', FangSong, STFangSong, serif",
  'font-fz-kai': "'FZKai-Z03', 'FZ Kai-Z-03', KaiTi, STKaiti, serif",
}

export function resolveFontFamilyStack(font: FontFamilyClass): string {
  return FONT_FAMILY_STACKS[font]
}

/** 远程字体文件本身为 Regular；字重范围声明便于匹配用户选择的 font-weight */
const REMOTE_FONT_WEIGHT = 400

function formatHint(format: FontFormat): string {
  return format === 'woff2' ? 'woff2' : 'truetype'
}

function injectSingleFontFace(font: RemoteFontFamily, config: SingleSourceFont): void {
  if (fontElementMap.has(font) || document.getElementById(`xb-font-${font}`)) return

  const style = document.createElement('style')
  style.id = `xb-font-${font}`
  // weight 范围让 400–700 的设置都能命中该 face，粗体由浏览器合成
  style.textContent = `
    @font-face {
      font-family: "${config.family}";
      font-style: normal;
      font-weight: 100 900;
      font-display: swap;
      src: url("${config.url}") format("${formatHint(config.format)}");
    }
  `
  document.head.appendChild(style)
  fontElementMap.set(font, style)
}

function injectStylesheetLink(font: RemoteFontFamily, config: StylesheetFont): Promise<void> {
  const existing = document.getElementById(`xb-font-${font}`)
  if (existing instanceof HTMLLinkElement) {
    fontElementMap.set(font, existing)
    if (existing.dataset.xbLoaded === '1') return Promise.resolve()
    return new Promise((resolve, reject) => {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${font}`)), {
        once: true,
      })
    })
  }

  return new Promise((resolve, reject) => {
    const link = document.createElement('link')
    link.id = `xb-font-${font}`
    link.rel = 'stylesheet'
    link.href = config.stylesheetUrl
    link.dataset.xbFont = font
    link.addEventListener(
      'load',
      () => {
        link.dataset.xbLoaded = '1'
        resolve()
      },
      { once: true },
    )
    link.addEventListener(
      'error',
      () => reject(new Error(`Failed to load stylesheet for ${font}`)),
      { once: true },
    )
    document.head.appendChild(link)
    fontElementMap.set(font, link)
  })
}

async function ensureFontReady(family: string): Promise<boolean> {
  // 用中英字符触发 CJK 分片加载
  await document.fonts.load(`${REMOTE_FONT_WEIGHT} 16px "${family}"`, '字Aa')
  await document.fonts.ready
  return document.fonts.check(`${REMOTE_FONT_WEIGHT} 16px "${family}"`, '字')
}

function removeFontElement(font: RemoteFontFamily): void {
  const el = fontElementMap.get(font) ?? document.getElementById(`xb-font-${font}`)
  if (el) el.remove()
  fontElementMap.delete(font)
}

/**
 * 加载远程字体。同一字体并发调用会复用 Promise。
 * 成功返回 true；失败清理注入并返回 false。
 */
export async function loadFont(font: RemoteFontFamily): Promise<boolean> {
  const config = REMOTE_FONTS[font]
  if (!config) return false

  const inflight = loadPromises.get(font)
  if (inflight) return inflight

  const promise = (async (): Promise<boolean> => {
    try {
      if (config.kind === 'stylesheet') {
        await injectStylesheetLink(font, config)
        const ok = await ensureFontReady(config.family)
        if (!ok) {
          // 分片字体 check 可能因尚未用到的 range 不完整；stylesheet load 成功即视为可用
          return true
        }
        return true
      }

      // single：优先 FontFace API，失败再回退 @font-face 注入
      const already = [...document.fonts].some(
        (f) => f.family.replace(/['"]/g, '') === config.family && f.status === 'loaded',
      )
      if (already) return true

      try {
        const fontFace = new FontFace(config.family, `url("${config.url}")`, {
          style: 'normal',
          weight: '100 900',
          display: 'swap',
        })
        const loaded = await fontFace.load()
        document.fonts.add(loaded)
      } catch {
        // FontFace 失败时回退到 CSS @font-face（部分环境对跨域 FontFace 更严）
      }

      injectSingleFontFace(font, config)
      const ok = await ensureFontReady(config.family)
      if (!ok) {
        removeFontElement(font)
        return false
      }
      return true
    } catch (err) {
      console.error(`[font-loader] Failed to load ${font}:`, err)
      removeFontElement(font)
      return false
    } finally {
      loadPromises.delete(font)
    }
  })()

  loadPromises.set(font, promise)
  return promise
}

/** 测试 / 清理用：重置模块内加载状态 */
export function resetFontLoaderStateForTests(): void {
  for (const font of remoteFonts) {
    removeFontElement(font)
  }
  loadPromises.clear()
}

export const FONT_FAMILY_CLASSES: FontFamilyClass[] = [
  'font-sans',
  'font-serif',
  'font-simsun',
  'font-fangsong',
  'font-simhei',
  'font-kaiti',
  ...remoteFonts,
]

export const REMOTE_FONT_OPTIONS: {
  value: RemoteFontFamily
  label: string
  group: 'sans' | 'serif'
}[] = [
  // 无衬线 · 屏幕阅读
  { value: 'font-misans', label: 'MiSans 小米兰亭', group: 'sans' },
  { value: 'font-harmonyos-sans', label: '鸿蒙黑体', group: 'sans' },
  { value: 'font-lxgw-neo-xihei', label: '霞鹜新晰黑', group: 'sans' },
  { value: 'font-source-han-sans', label: '思源黑体', group: 'sans' },
  { value: 'font-lxgw-marker-gothic', label: '霞鹜漫黑', group: 'sans' },
  { value: 'font-dingtalk-jinbu', label: '钉钉进步体', group: 'sans' },
  { value: 'font-smiley-sans', label: '得意黑', group: 'sans' },
  // 衬线 / 楷体 · 长文阅读
  { value: 'font-lxgw-wenkai-screen', label: '霞鹜文楷 屏幕版', group: 'serif' },
  { value: 'font-lxgw-wenkai', label: '霞鹜文楷', group: 'serif' },
  { value: 'font-lxgw-neo-zhisong', label: '霞鹜新致宋', group: 'serif' },
  { value: 'font-source-han-serif', label: '思源宋体', group: 'serif' },
  { value: 'font-jixiang-song', label: '欣意吉祥宋', group: 'serif' },
  { value: 'font-zhuque', label: '朱雀仿宋', group: 'serif' },
  { value: 'font-fz-kai', label: '方正楷体', group: 'serif' },
]
