import { useEffect, useState } from 'react'

import type {
  ContentFontSize,
  FontFamilyClass,
  FontWeightClass,
  LetterSpacingClass,
  LineHeightClass,
} from '@/lib/app-settings'
import { useAppSettings } from '@/lib/app-settings-store'
import { isRemoteFont, loadFont, type RemoteFontFamily } from '@/lib/font-loader'
import { cn } from '@/lib/utils'

export type FontLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export function useFontSettings() {
  const contentFontSize = useAppSettings((s) => s.contentFontSize) as ContentFontSize
  const fontWeightClass = useAppSettings((s) => s.fontWeightClass) as FontWeightClass
  const letterSpacingClass = useAppSettings((s) => s.letterSpacingClass) as LetterSpacingClass
  const lineHeightClass = useAppSettings((s) => s.lineHeightClass) as LineHeightClass
  const fontFamilyClass = useAppSettings((s) => s.fontFamilyClass) as FontFamilyClass

  const [loadStatus, setLoadStatus] = useState<FontLoadStatus>(() =>
    isRemoteFont(fontFamilyClass) ? 'loading' : 'idle',
  )

  useEffect(() => {
    if (!isRemoteFont(fontFamilyClass)) {
      setLoadStatus('idle')
      return
    }

    let cancelled = false
    setLoadStatus('loading')

    void loadFont(fontFamilyClass as RemoteFontFamily).then((ok) => {
      if (cancelled) return
      setLoadStatus(ok ? 'ready' : 'error')
    })

    return () => {
      cancelled = true
    }
  }, [fontFamilyClass])

  const textClassName = cn(
    'xb-status-text',
    fontWeightClass,
    letterSpacingClass,
    lineHeightClass,
    fontFamilyClass,
  )

  return {
    contentFontSize,
    fontWeightClass,
    letterSpacingClass,
    lineHeightClass,
    fontFamilyClass,
    loadStatus,
    isRemote: isRemoteFont(fontFamilyClass),
    textClassName,
  }
}
