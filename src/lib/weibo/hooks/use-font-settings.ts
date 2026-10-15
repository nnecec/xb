import { cn } from 'cn'
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

export type FontLoadStatus = 'idle' | 'loading' | 'ready' | 'error'

export function useFontSettings() {
  const contentFontSize = useAppSettings((s) => s.contentFontSize) as ContentFontSize
  const fontWeightClass = useAppSettings((s) => s.fontWeightClass) as FontWeightClass
  const letterSpacingClass = useAppSettings((s) => s.letterSpacingClass) as LetterSpacingClass
  const lineHeightClass = useAppSettings((s) => s.lineHeightClass) as LineHeightClass
  const fontFamilyClass = useAppSettings((s) => s.fontFamilyClass) as FontFamilyClass

  const [trackedFont, setTrackedFont] = useState(fontFamilyClass)
  const [remoteStatus, setRemoteStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  if (trackedFont !== fontFamilyClass) {
    setTrackedFont(fontFamilyClass)
    if (isRemoteFont(fontFamilyClass)) setRemoteStatus('loading')
  }
  const loadStatus: FontLoadStatus = isRemoteFont(fontFamilyClass) ? remoteStatus : 'idle'

  useEffect(() => {
    if (!isRemoteFont(fontFamilyClass)) return

    let cancelled = false
    void loadFont(fontFamilyClass as RemoteFontFamily).then((ok) => {
      if (cancelled) return
      setRemoteStatus(ok ? 'ready' : 'error')
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
