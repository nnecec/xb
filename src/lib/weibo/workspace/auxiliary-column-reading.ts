import type { ColumnNavigationLocation } from '@/lib/weibo/route/page-descriptor'
import { parseWeiboUrl } from '@/lib/weibo/route/parse-weibo-url'
import type { ColumnSource } from '@/lib/weibo/workspace/workspace-store'

export interface AuxiliaryColumnReadingSnapshot {
  current: ColumnNavigationLocation | null
  base: ColumnNavigationLocation | null
}

export interface AuxiliaryColumnReadingState {
  source: ColumnSource
  base: ColumnNavigationLocation | null
  stack: ColumnNavigationLocation[]
  page: ColumnNavigationLocation | null
  canGoBack: boolean
  persisted: AuxiliaryColumnReadingSnapshot
}

function sourcePage(source: ColumnSource): ColumnNavigationLocation | null {
  switch (source.kind) {
    case 'home':
      return {
        kind: 'home',
        tab: source.tab,
        ...(source.groupId ? { groupId: source.groupId } : {}),
      }
    case 'explore':
      return { kind: 'explore', groupId: source.groupId ?? '102803' }
    case 'saved':
      return source.tab === 'liked'
        ? { kind: 'liked', uid: source.uid }
        : { kind: 'favorites', uid: source.uid }
    case 'favorites':
      return { kind: 'favorites', uid: source.uid }
    case 'liked':
      return { kind: 'liked', uid: source.uid }
    case 'notifications':
      return { kind: 'notifications', tab: source.tab ?? 'mentions' }
    case 'topic':
      return { kind: 'topic', topic: source.topic }
    case 'follow':
      return { kind: 'follow', uid: source.uid, tab: source.tab }
    case 'profile':
      return {
        kind: 'profile',
        profileId: source.profileId,
        profileSource: source.profileSource,
        tab: 'posts',
      }
    case 'history':
      return { kind: 'history' }
    default:
      return null
  }
}

function sameLocation(
  left: ColumnNavigationLocation | null,
  right: ColumnNavigationLocation | null,
): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

function present(
  source: ColumnSource,
  base: ColumnNavigationLocation | null,
  stack: ColumnNavigationLocation[],
): AuxiliaryColumnReadingState {
  const page = stack.at(-1) ?? base
  const current = page ?? sourcePage(source)
  return {
    source,
    base,
    stack,
    page: current,
    canGoBack: stack.length > 0,
    persisted: sameLocation(current, sourcePage(source))
      ? { current: null, base: null }
      : { current, base },
  }
}

export function createAuxiliaryColumnReading(input: {
  source: ColumnSource
  persisted?: AuxiliaryColumnReadingSnapshot
}): AuxiliaryColumnReadingState {
  return present(input.source, sourcePage(input.source), [])
}

function persistedBelongsToSource(
  source: ColumnSource,
  persisted: AuxiliaryColumnReadingSnapshot,
): boolean {
  const home = sourcePage(source)
  if (!home) return persisted.base === null
  const base = persisted.base ?? home
  if (home.kind !== base.kind) return false
  if (source.kind === 'home' || source.kind === 'explore' || source.kind === 'notifications') {
    return true
  }
  return sameLocation(base, home) || sameLocation(persisted.current, home)
}

export function restoreAuxiliaryColumnReading(input: {
  source: ColumnSource
  persisted: AuxiliaryColumnReadingSnapshot
}): AuxiliaryColumnReadingState {
  if (!persistedBelongsToSource(input.source, input.persisted)) {
    return present(input.source, sourcePage(input.source), [])
  }
  const base = input.persisted.base ?? sourcePage(input.source)
  const current = input.persisted.current
  const stack = current && !sameLocation(current, base) ? [current] : []
  return present(input.source, base, stack)
}

const SECTION_KINDS = new Set<ColumnNavigationLocation['kind']>([
  'home',
  'explore',
  'notifications',
  'favorites',
  'liked',
  'follow',
])

export function replaceAuxiliaryColumnSection(
  state: AuxiliaryColumnReadingState,
  location: ColumnNavigationLocation,
): AuxiliaryColumnReadingState {
  const visible = state.stack.at(-1) ?? state.base
  if (sameLocation(visible, location)) return state
  if (!visible || !SECTION_KINDS.has(visible.kind) || !SECTION_KINDS.has(location.kind)) {
    return state
  }
  return present(state.source, location, [])
}

export function followAuxiliaryColumnTarget(
  state: AuxiliaryColumnReadingState,
  target: string,
  mode: 'push' | 'replace' = 'push',
): AuxiliaryColumnReadingState {
  const url = new URL(target, 'https://weibo.com')
  const page = parseWeiboUrl(url.href)
  if (page.kind === 'unsupported') return state
  const location: ColumnNavigationLocation =
    page.kind === 'follow'
      ? { ...page, tab: url.searchParams.get('tab') === 'fans' ? 'fans' : 'following' }
      : page
  if (mode !== 'replace') return openAuxiliaryColumnReading(state, location)
  const visible = state.stack.at(-1) ?? state.base
  if (visible && SECTION_KINDS.has(visible.kind) && SECTION_KINDS.has(location.kind)) {
    return replaceAuxiliaryColumnSection(state, location)
  }
  return openAuxiliaryColumnReading(state, location)
}

export function openAuxiliaryColumnReading(
  state: AuxiliaryColumnReadingState,
  location: ColumnNavigationLocation,
): AuxiliaryColumnReadingState {
  const visible = state.stack.at(-1) ?? state.base
  if (sameLocation(visible, location)) return state
  return present(state.source, state.base, [...state.stack, location])
}

export function backAuxiliaryColumnReading(
  state: AuxiliaryColumnReadingState,
): AuxiliaryColumnReadingState {
  if (state.stack.length === 0) return state
  return present(state.source, state.base, state.stack.slice(0, -1))
}
