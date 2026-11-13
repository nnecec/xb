import { useStore } from 'zustand'
import { createStore, type StoreApi } from 'zustand/vanilla'

import {
  CUSTOM_COLUMN_WIDTH_MAX,
  CUSTOM_COLUMN_WIDTH_MIN,
  type AppSettingsStorageArea,
  type HomeTab,
  type HotSearchType,
} from '@/lib/app-settings'
import type { ColumnNavigationLocation, NotificationTab } from '@/lib/weibo/route/page-descriptor'
import type { ProfileSearchUrlState } from '@/lib/weibo/route/profile-search-params'

export const WORKSPACE_STORAGE_KEY = 'xb:workspace'
export const WORKSPACE_VERSION = 1 as const

export type ColumnSource =
  | { kind: 'home'; tab: HomeTab; groupId?: string; label?: string }
  | { kind: 'explore'; groupId?: string; label?: string }
  | { kind: 'topic'; topic: string; channelType?: string }
  | {
      kind: 'profile'
      profileId: string
      profileSource: 'u' | 'n'
      label?: string
      search?: ProfileSearchUrlState
    }
  | { kind: 'follow'; uid: string; tab: 'following' | 'fans' }
  | { kind: 'saved'; uid: string; tab?: 'favorites' | 'liked' }
  /** @deprecated Loaded and normalized as the combined saved column. */
  | { kind: 'favorites'; uid: string }
  /** @deprecated Loaded and normalized as the combined saved column. */
  | { kind: 'liked'; uid: string }
  | { kind: 'notifications'; tab?: NotificationTab }
  | { kind: 'history' }
  | { kind: 'hot-search'; type?: HotSearchType }
  | { kind: 'followed-super-topics' }
  | { kind: 'search-entry' }

export interface AuxiliaryColumn {
  id: string
  source: ColumnSource
  /** Per-instance override; absent columns use the configured/default width. */
  width?: number
  lastLocation?: ColumnNavigationLocation
  lastBaseLocation?: ColumnNavigationLocation
}

export type ColumnWidthOverrides = Partial<Record<ColumnSource['kind'], number>>

export interface WorkspaceSnapshot {
  auxiliaryColumns: AuxiliaryColumn[]
  focusedColumnId: string | null
  /** The last width used for each source kind, applied to columns added later. */
  columnWidths: ColumnWidthOverrides
  /** Horizontal scroll of the column canvas, restored after a reload. */
  canvasScrollLeft: number
}

export interface WorkspaceStoreState extends WorkspaceSnapshot {
  isHydrated: boolean
  hydrate: () => Promise<void>
  addColumn: (source: ColumnSource, defaultWidth?: number) => Promise<string>
  removeColumn: (columnId: string) => Promise<void>
  moveColumn: (columnId: string, targetIndex: number) => Promise<void>
  focusColumn: (columnId: string | null) => Promise<void>
  setColumnLastLocation: (
    columnId: string,
    location: ColumnNavigationLocation | null,
    baseLocation?: ColumnNavigationLocation | null,
  ) => Promise<void>
  setColumnWidth: (columnId: string, width: number) => Promise<void>
  resetColumnWidths: () => Promise<void>
  setCanvasScrollLeft: (scrollLeft: number) => Promise<void>
}

export type WorkspaceStore = StoreApi<WorkspaceStoreState>

type WorkspaceStorageChangeEvent = Pick<
  typeof browser.storage.onChanged,
  'addListener' | 'removeListener'
>

const DEFAULT_WORKSPACE: WorkspaceSnapshot = {
  auxiliaryColumns: [],
  focusedColumnId: null,
  columnWidths: {},
  canvasScrollLeft: 0,
}

export function normalizeCanvasScrollLeft(value: unknown): number {
  const numeric = typeof value === 'number' ? value : Number.NaN
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return Math.round(numeric)
}

export function normalizeColumnWidth(value: unknown, fallback = CUSTOM_COLUMN_WIDTH_MIN): number {
  const numeric = typeof value === 'number' ? value : Number.NaN
  if (!Number.isFinite(numeric)) return fallback
  return Math.round(Math.min(CUSTOM_COLUMN_WIDTH_MAX, Math.max(CUSTOM_COLUMN_WIDTH_MIN, numeric)))
}

export interface WorkspaceStoreOptions {
  createId?: () => string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object')
}

function isHomeTab(value: unknown): value is HomeTab {
  return (
    value === 'for-you' ||
    value === 'following' ||
    value === 'special-follow' ||
    value === 'friend-circle'
  )
}

function isNotificationTab(value: unknown): value is NotificationTab {
  return value === 'mentions' || value === 'comments' || value === 'likes'
}

function isHotSearchType(value: unknown): value is HotSearchType {
  return (
    value === 'hot' ||
    value === 'mine' ||
    value === 'entertainment' ||
    value === 'life' ||
    value === 'social'
  )
}

function normalizeString(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

function normalizeProfileSearch(value: unknown): ProfileSearchUrlState | null {
  if (!isRecord(value) || value.active !== true || !isRecord(value.params)) return null
  const { params } = value
  if (
    typeof params.query !== 'string' ||
    !params.query.trim() ||
    !(params.starttime === null || Number.isSafeInteger(params.starttime)) ||
    !Number.isSafeInteger(params.endtime) ||
    !isRecord(params.filters)
  ) {
    return null
  }
  const filters = params.filters
  const filterKeys = ['hasori', 'hasret', 'hastext', 'haspic', 'hasvideo', 'hasmusic'] as const
  if (filterKeys.some((key) => typeof filters[key] !== 'boolean')) return null
  return {
    active: true,
    params: {
      query: params.query.trim(),
      starttime: params.starttime as number | null,
      endtime: params.endtime as number,
      filters: Object.fromEntries(
        filterKeys.map((key) => [key, filters[key] as boolean]),
      ) as ProfileSearchUrlState['params']['filters'],
    },
  }
}

function normalizeColumnSource(value: unknown): ColumnSource | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null

  if (value.kind === 'home' && isHomeTab(value.tab)) {
    const groupId = normalizeString(value.groupId)
    const label = normalizeString(value.label)
    return {
      kind: 'home',
      tab: value.tab,
      ...(groupId ? { groupId } : {}),
      ...(groupId && label ? { label } : {}),
    }
  }

  if (value.kind === 'explore') {
    const groupId = normalizeString(value.groupId)
    const label = normalizeString(value.label)
    return { kind: 'explore', ...(groupId ? { groupId } : {}), ...(label ? { label } : {}) }
  }

  if (value.kind === 'topic') {
    const topic = normalizeString(value.topic)
    const channelType = normalizeString(value.channelType)
    return topic ? { kind: 'topic', topic, ...(channelType ? { channelType } : {}) } : null
  }

  if (value.kind === 'profile') {
    const profileId = normalizeString(value.profileId)
    const label = normalizeString(value.label)
    const search = normalizeProfileSearch(value.search)
    return profileId && (value.profileSource === 'u' || value.profileSource === 'n')
      ? {
          kind: 'profile',
          profileId,
          profileSource: value.profileSource,
          ...(label ? { label } : {}),
          ...(search ? { search } : {}),
        }
      : null
  }

  if (value.kind === 'follow') {
    const uid = normalizeString(value.uid)
    return uid && (value.tab === 'following' || value.tab === 'fans')
      ? { kind: 'follow', uid, tab: value.tab }
      : null
  }

  if (value.kind === 'saved') {
    const uid = normalizeString(value.uid)
    const tab =
      value.tab === 'liked' ? 'liked' : value.tab === 'favorites' ? 'favorites' : undefined
    return uid ? { kind: 'saved', uid, ...(tab ? { tab } : {}) } : null
  }

  if (value.kind === 'favorites' || value.kind === 'liked') {
    const uid = normalizeString(value.uid)
    return uid ? { kind: 'saved', uid, tab: value.kind } : null
  }

  if (value.kind === 'notifications') {
    return isNotificationTab(value.tab)
      ? { kind: 'notifications', tab: value.tab }
      : { kind: 'notifications' }
  }

  if (value.kind === 'history') return { kind: 'history' }

  if (value.kind === 'hot-search') {
    return isHotSearchType(value.type)
      ? { kind: 'hot-search', type: value.type }
      : { kind: 'hot-search' }
  }

  if (value.kind === 'followed-super-topics') {
    return { kind: 'followed-super-topics' }
  }

  if (value.kind === 'search-entry') return { kind: 'search-entry' }

  return null
}

export function columnSourceIdentity(source: ColumnSource): string {
  switch (source.kind) {
    case 'home':
      return JSON.stringify([source.kind, source.tab, source.groupId ?? null])
    case 'explore':
      return JSON.stringify([source.kind])
    case 'topic':
      return JSON.stringify([source.kind, source.topic, source.channelType ?? null])
    case 'profile':
      return JSON.stringify([
        source.kind,
        source.profileSource,
        source.profileId,
        source.search ?? null,
      ])
    case 'follow':
      return JSON.stringify([source.kind, source.uid, source.tab])
    case 'saved':
      return JSON.stringify([source.kind, source.uid])
    case 'favorites':
    case 'liked':
      return JSON.stringify(['saved', source.uid])
    case 'notifications':
      return JSON.stringify([source.kind])
    case 'history':
    case 'followed-super-topics':
    case 'search-entry':
      return JSON.stringify([source.kind])
    case 'hot-search':
      return JSON.stringify([source.kind])
  }
}

export function columnSourceTitle(source: ColumnSource): string {
  switch (source.kind) {
    case 'home':
      if (source.groupId) return source.label ?? '用户分组'
      if (source.tab === 'for-you') return '推荐'
      if (source.tab === 'following')
        return source.groupId ? (source.label ?? '用户分组') : '用户分组'
      if (source.tab === 'special-follow') return '特别关注'
      return '朋友圈'
    case 'explore':
      return source.label ?? '探索'
    case 'topic':
      return source.topic
    case 'profile':
      return source.label ?? source.profileId
    case 'follow':
      return source.tab === 'following' ? '关注' : '粉丝'
    case 'saved':
      if (source.tab === 'liked') return '我的赞'
      if (source.tab === 'favorites') return '我的收藏'
      return '我的收藏 / 我的赞'
    case 'favorites':
      return '我的收藏'
    case 'liked':
      return '我的赞'
    case 'notifications':
      if (!source.tab) return '通知'
      if (source.tab === 'mentions') return '@我'
      if (source.tab === 'comments') return '评论'
      return '赞'
    case 'history':
      return '浏览历史'
    case 'hot-search':
      if (!source.type || source.type === 'hot') return '热搜'
      if (source.type === 'mine') return '我的'
      if (source.type === 'entertainment') return '文娱'
      if (source.type === 'life') return '生活'
      return '社会'
    case 'followed-super-topics':
      return '我关注的超话'
    case 'search-entry':
      return '搜索'
  }
}

function normalizeColumnNavigationLocation(value: unknown): ColumnNavigationLocation | null {
  if (!isRecord(value) || typeof value.kind !== 'string') return null

  if (value.kind === 'home' && isHomeTab(value.tab)) {
    const groupId = normalizeString(value.groupId)
    return { kind: 'home', tab: value.tab, ...(groupId ? { groupId } : {}) }
  }
  if (value.kind === 'status') {
    const authorId = normalizeString(value.authorId)
    const statusId = normalizeString(value.statusId)
    return authorId && statusId ? { kind: 'status', authorId, statusId } : null
  }
  if (value.kind === 'profile') {
    const profileId = normalizeString(value.profileId)
    return profileId &&
      (value.profileSource === 'u' || value.profileSource === 'n') &&
      (value.tab === 'posts' || value.tab === 'replies' || value.tab === 'media')
      ? { kind: 'profile', profileId, profileSource: value.profileSource, tab: value.tab }
      : null
  }
  if (value.kind === 'follow') {
    const uid = normalizeString(value.uid)
    return uid && (value.tab === 'following' || value.tab === 'fans')
      ? { kind: 'follow', uid, tab: value.tab }
      : null
  }
  if (value.kind === 'favorites' || value.kind === 'liked') {
    const uid = normalizeString(value.uid)
    return uid ? { kind: value.kind, uid } : null
  }
  if (value.kind === 'notifications') {
    return isNotificationTab(value.tab) ? { kind: 'notifications', tab: value.tab } : null
  }
  if (value.kind === 'explore') {
    const groupId = normalizeString(value.groupId)
    return groupId ? { kind: 'explore', groupId } : null
  }
  if (value.kind === 'history') return { kind: 'history' }
  if (value.kind === 'topic') {
    const topic = normalizeString(value.topic)
    return topic ? { kind: 'topic', topic } : null
  }
  return null
}

function normalizeAuxiliaryColumn(value: unknown): AuxiliaryColumn | null {
  if (!isRecord(value)) return null
  const source = normalizeColumnSource(value.source)
  if (typeof value.id !== 'string' || !value.id.trim() || !source) {
    return null
  }
  const lastLocation = normalizeColumnNavigationLocation(value.lastLocation)
  const lastBaseLocation = normalizeColumnNavigationLocation(value.lastBaseLocation)
  const normalizedLastLocation = lastLocation ?? undefined
  const normalizedLastBaseLocation = lastBaseLocation ?? undefined
  const width = normalizeColumnWidth(value.width, CUSTOM_COLUMN_WIDTH_MIN)

  return {
    id: value.id,
    source,
    ...(typeof value.width === 'number' ? { width } : {}),
    ...(normalizedLastLocation ? { lastLocation: normalizedLastLocation } : {}),
    ...(normalizedLastBaseLocation ? { lastBaseLocation: normalizedLastBaseLocation } : {}),
  }
}

function normalizeWorkspace(value: unknown): WorkspaceSnapshot {
  if (!isRecord(value) || value.version !== WORKSPACE_VERSION) {
    return { ...DEFAULT_WORKSPACE }
  }

  const normalizedColumns = Array.isArray(value.auxiliaryColumns)
    ? value.auxiliaryColumns
        .map(normalizeAuxiliaryColumn)
        .filter((column): column is AuxiliaryColumn => column !== null)
    : []
  const columnWidths: ColumnWidthOverrides = {}
  if (isRecord(value.columnWidths)) {
    for (const kind of [
      'home',
      'explore',
      'topic',
      'profile',
      'follow',
      'saved',
      'notifications',
      'history',
      'hot-search',
      'followed-super-topics',
      'search-entry',
    ] as const) {
      if (typeof value.columnWidths[kind] === 'number') {
        columnWidths[kind] = normalizeColumnWidth(value.columnWidths[kind])
      }
    }

    // Older snapshots used separate favorites/liked source kinds. Those
    // sources normalize to saved, so carry their width forward as well.
    if (columnWidths.saved === undefined) {
      for (const alias of ['favorites', 'liked'] as const) {
        if (typeof value.columnWidths[alias] === 'number') {
          columnWidths.saved = normalizeColumnWidth(value.columnWidths[alias])
          break
        }
      }
    }
  }
  const seenIds = new Set<string>()
  // Columns are instances, not source bookmarks. The same source may be added
  // more than once so each instance can keep its own selected subgroup.
  const auxiliaryColumns = normalizedColumns.filter((column) => {
    if (seenIds.has(column.id)) return false
    seenIds.add(column.id)
    return true
  })
  const focusedColumnId =
    typeof value.focusedColumnId === 'string' &&
    auxiliaryColumns.some((column) => column.id === value.focusedColumnId)
      ? value.focusedColumnId
      : null

  return {
    auxiliaryColumns,
    focusedColumnId,
    columnWidths,
    canvasScrollLeft: normalizeCanvasScrollLeft(value.canvasScrollLeft),
  }
}

function serializeWorkspace(snapshot: WorkspaceSnapshot) {
  return {
    version: WORKSPACE_VERSION,
    auxiliaryColumns: snapshot.auxiliaryColumns,
    focusedColumnId: snapshot.focusedColumnId,
    ...(Object.keys(snapshot.columnWidths).length > 0
      ? { columnWidths: snapshot.columnWidths }
      : {}),
    ...(snapshot.canvasScrollLeft > 0 ? { canvasScrollLeft: snapshot.canvasScrollLeft } : {}),
  }
}

let fallbackLockQueue: Promise<unknown> = Promise.resolve()

function getDefaultStorageArea(): AppSettingsStorageArea {
  if (typeof browser !== 'undefined' && browser.storage?.local) return browser.storage.local
  return {
    get: async () => ({}),
    set: async () => {},
  }
}

async function withWorkspaceStorageLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== 'undefined' && navigator.locks) {
    return navigator.locks.request(WORKSPACE_STORAGE_KEY, task)
  }
  const lockedTask = fallbackLockQueue.then(task)
  fallbackLockQueue = lockedTask.catch(() => {})
  return lockedTask
}

export function createWorkspaceStore(
  storageArea: AppSettingsStorageArea = getDefaultStorageArea(),
  options: WorkspaceStoreOptions = {},
): WorkspaceStore {
  const createId = options.createId ?? (() => crypto.randomUUID())

  return createStore<WorkspaceStoreState>((set, get) => {
    let persistQueue: Promise<unknown> = Promise.resolve()

    function updateAndPersist(updater: (current: WorkspaceSnapshot) => WorkspaceSnapshot) {
      const persistTask = persistQueue.then(() =>
        withWorkspaceStorageLock(async () => {
          const stored = await storageArea.get(WORKSPACE_STORAGE_KEY)
          const current = normalizeWorkspace(stored[WORKSPACE_STORAGE_KEY])
          const next = updater(current)
          await storageArea.set({ [WORKSPACE_STORAGE_KEY]: serializeWorkspace(next) })
          set(next)
          return next
        }),
      )
      persistQueue = persistTask.catch(() => {})
      return persistTask
    }

    return {
      ...DEFAULT_WORKSPACE,
      isHydrated: false,
      async hydrate() {
        const stored = await storageArea.get(WORKSPACE_STORAGE_KEY)
        set({
          ...normalizeWorkspace(stored[WORKSPACE_STORAGE_KEY]),
          isHydrated: true,
        })
      },
      async addColumn(source, defaultWidth) {
        const normalizedSource = normalizeColumnSource(source)
        if (!normalizedSource) throw new Error('无效的列来源')
        let id = ''
        await updateAndPersist((snapshot) => {
          id = createId()
          const configuredWidth = snapshot.columnWidths[normalizedSource.kind]
          const width =
            configuredWidth ??
            (defaultWidth === undefined ? undefined : normalizeColumnWidth(defaultWidth))
          return {
            ...snapshot,
            auxiliaryColumns: [
              ...snapshot.auxiliaryColumns,
              { id, source: normalizedSource, ...(width !== undefined ? { width } : {}) },
            ],
            focusedColumnId: id,
          }
        })
        return id
      },
      async removeColumn(columnId) {
        await updateAndPersist((snapshot) => {
          if (!snapshot.auxiliaryColumns.some((column) => column.id === columnId)) {
            return snapshot
          }
          return {
            ...snapshot,
            auxiliaryColumns: snapshot.auxiliaryColumns.filter((column) => column.id !== columnId),
            focusedColumnId:
              snapshot.focusedColumnId === columnId ? null : snapshot.focusedColumnId,
          }
        })
      },
      async moveColumn(columnId, targetIndex) {
        await updateAndPersist((snapshot) => {
          const currentIndex = snapshot.auxiliaryColumns.findIndex(
            (column) => column.id === columnId,
          )
          if (currentIndex < 0) return snapshot
          const columns = [...snapshot.auxiliaryColumns]
          const [column] = columns.splice(currentIndex, 1)
          if (!column) return snapshot
          const nextIndex = Math.max(0, Math.min(Math.trunc(targetIndex), columns.length))
          columns.splice(nextIndex, 0, column)
          return { ...snapshot, auxiliaryColumns: columns }
        })
      },
      async focusColumn(columnId) {
        const current = get()
        if (
          current.focusedColumnId === columnId ||
          (columnId !== null && !current.auxiliaryColumns.some((column) => column.id === columnId))
        ) {
          return
        }
        await updateAndPersist((snapshot) => ({
          ...snapshot,
          focusedColumnId: columnId,
        }))
      },
      async setColumnLastLocation(columnId, location, baseLocation) {
        await updateAndPersist((snapshot) => ({
          ...snapshot,
          auxiliaryColumns: snapshot.auxiliaryColumns.map((column) => {
            if (column.id !== columnId) return column
            const nextColumn = { ...column }
            nextColumn.lastLocation = location ?? undefined
            if (baseLocation !== undefined) nextColumn.lastBaseLocation = baseLocation ?? undefined
            return nextColumn
          }),
        }))
      },
      async setColumnWidth(columnId, width) {
        await updateAndPersist((snapshot) => {
          const column = snapshot.auxiliaryColumns.find((item) => item.id === columnId)
          if (!column) return snapshot
          const normalizedWidth = normalizeColumnWidth(width)
          return {
            ...snapshot,
            auxiliaryColumns: snapshot.auxiliaryColumns.map((item) =>
              item.id === columnId ? { ...item, width: normalizedWidth } : item,
            ),
            columnWidths: {
              ...snapshot.columnWidths,
              [column.source.kind]: normalizedWidth,
            },
          }
        })
      },
      async resetColumnWidths() {
        await updateAndPersist((snapshot) => ({
          ...snapshot,
          auxiliaryColumns: snapshot.auxiliaryColumns.map((column) => {
            const nextColumn = { ...column }
            delete nextColumn.width
            return nextColumn
          }),
          columnWidths: {},
        }))
      },
      async setCanvasScrollLeft(scrollLeft) {
        const canvasScrollLeft = normalizeCanvasScrollLeft(scrollLeft)
        const current = get()
        if (current.canvasScrollLeft === canvasScrollLeft) return
        await updateAndPersist((snapshot) =>
          snapshot.canvasScrollLeft === canvasScrollLeft
            ? snapshot
            : { ...snapshot, canvasScrollLeft },
        )
      },
    }
  })
}

let workspaceStore: WorkspaceStore | null = null

export function getWorkspaceStore(storageArea?: AppSettingsStorageArea): WorkspaceStore {
  if (!workspaceStore) {
    workspaceStore = createWorkspaceStore(storageArea)
  }

  return workspaceStore
}

export function resetWorkspaceStoreForTest() {
  workspaceStore = null
}

export function bindWorkspaceStorageSync(
  store: WorkspaceStore,
  storageChanges: WorkspaceStorageChangeEvent = browser.storage.onChanged,
) {
  const onStorageChanged: Parameters<WorkspaceStorageChangeEvent['addListener']>[0] = (
    changes,
    areaName,
  ) => {
    if (areaName !== 'local' || !(WORKSPACE_STORAGE_KEY in changes)) return
    store.setState(normalizeWorkspace(changes[WORKSPACE_STORAGE_KEY]?.newValue))
  }

  storageChanges.addListener(onStorageChanged)
  return () => storageChanges.removeListener(onStorageChanged)
}

export function useWorkspace<T>(selector: (state: WorkspaceStoreState) => T): T {
  return useStore(getWorkspaceStore(), selector)
}
