import { describe, expect, it, vi } from 'vitest'

import type { AppSettingsStorageArea } from '@/lib/app-settings'
import {
  bindWorkspaceStorageSync,
  columnSourceIdentity,
  columnSourceTitle,
  createWorkspaceStore,
  WORKSPACE_STORAGE_KEY,
} from '@/lib/weibo/workspace/workspace-store'

function createStorageArea(initialValue?: unknown): AppSettingsStorageArea {
  let stored = initialValue

  return {
    get: vi.fn(async () => ({
      [WORKSPACE_STORAGE_KEY]: stored,
    })),
    set: vi.fn(async (items) => {
      stored = items[WORKSPACE_STORAGE_KEY]
    }),
  }
}

describe('workspace store', () => {
  it('hydrates an empty workspace when nothing has been saved', async () => {
    const store = createWorkspaceStore(createStorageArea())

    await store.getState().hydrate()

    expect(store.getState()).toMatchObject({
      auxiliaryColumns: [],
      focusedColumnId: null,
      isHydrated: true,
    })
  })

  it('hydrates a versioned auxiliary column snapshot', async () => {
    const storage = createStorageArea({
      version: 1,
      auxiliaryColumns: [
        {
          id: 'following-column',
          source: { kind: 'home', tab: 'following' },
        },
      ],
      focusedColumnId: 'following-column',
    })
    const store = createWorkspaceStore(storage)

    await store.getState().hydrate()

    expect(store.getState()).toMatchObject({
      auxiliaryColumns: [
        {
          id: 'following-column',
          source: { kind: 'home', tab: 'following' },
        },
      ],
      focusedColumnId: 'following-column',
      isHydrated: true,
    })
  })

  it('keeps valid columns while removing damaged entries and duplicate ids', async () => {
    const storage = createStorageArea({
      version: 1,
      auxiliaryColumns: [
        {
          id: 'following-column',
          title: '我关注的',
          source: { kind: 'home', tab: 'following' },
        },
        {
          id: 'duplicate-following-column',
          title: '我关注的',
          source: { kind: 'home', tab: 'following' },
        },
        {
          id: '',
          title: '损坏列',
          source: { kind: 'home', tab: 'for-you' },
        },
        {
          id: 'explore-column',
          title: '热门',
          source: { kind: 'explore', groupId: '102803' },
        },
      ],
      focusedColumnId: 'duplicate-following-column',
    })
    const store = createWorkspaceStore(storage)

    await store.getState().hydrate()

    expect(store.getState()).toMatchObject({
      auxiliaryColumns: [
        {
          id: 'following-column',
          source: { kind: 'home', tab: 'following' },
        },
        {
          id: 'duplicate-following-column',
          source: { kind: 'home', tab: 'following' },
        },
        {
          id: 'explore-column',
          source: { kind: 'explore', groupId: '102803' },
        },
      ],
      focusedColumnId: 'duplicate-following-column',
    })
  })

  it('restores and updates each column location independently', async () => {
    const storage = createStorageArea({
      version: 1,
      auxiliaryColumns: [
        {
          id: 'first-column',
          source: { kind: 'home', tab: 'following' },
          lastLocation: { kind: 'status', authorId: '1', statusId: '2' },
          lastBaseLocation: { kind: 'home', tab: 'following', groupId: 'group-a' },
        },
        { id: 'second-column', source: { kind: 'explore' } },
      ],
      focusedColumnId: null,
    })
    const store = createWorkspaceStore(storage)
    await store.getState().hydrate()

    expect(store.getState().auxiliaryColumns[0]).toMatchObject({
      id: 'first-column',
      lastLocation: { kind: 'status', authorId: '1', statusId: '2' },
      lastBaseLocation: { kind: 'home', tab: 'following', groupId: 'group-a' },
    })

    await store
      .getState()
      .setColumnLastLocation(
        'second-column',
        { kind: 'explore', groupId: '102804' },
        { kind: 'explore', groupId: '102804' },
      )
    expect(store.getState().auxiliaryColumns[0]).toMatchObject({ id: 'first-column' })
    expect(store.getState().auxiliaryColumns[1]).toMatchObject({
      lastLocation: { kind: 'explore', groupId: '102804' },
      lastBaseLocation: { kind: 'explore', groupId: '102804' },
    })
  })

  it('ignores an invalid persisted location without dropping its column', async () => {
    const store = createWorkspaceStore(
      createStorageArea({
        version: 1,
        auxiliaryColumns: [
          {
            id: 'column',
            source: { kind: 'home', tab: 'following' },
            lastLocation: { kind: 'status', authorId: '', statusId: '2' },
          },
        ],
        focusedColumnId: null,
      }),
    )
    await store.getState().hydrate()
    expect(store.getState().auxiliaryColumns).toEqual([
      { id: 'column', source: { kind: 'home', tab: 'following' } },
    ])
  })

  it('uses the complete normalized source as the duplicate identity', () => {
    expect(
      columnSourceIdentity({ kind: 'profile', profileSource: 'u', profileId: '123' }),
    ).not.toBe(columnSourceIdentity({ kind: 'profile', profileSource: 'u', profileId: '456' }))
    expect(columnSourceIdentity({ kind: 'home', tab: 'following' })).not.toBe(
      columnSourceIdentity({ kind: 'home', tab: 'following', groupId: 'group-a' }),
    )
    const profileSearch = {
      active: true,
      params: {
        query: '关键词',
        starttime: null,
        endtime: 1_700_000_000,
        filters: {
          hasori: true,
          hasret: true,
          hastext: true,
          haspic: true,
          hasvideo: true,
          hasmusic: true,
        },
      },
    }
    expect(
      columnSourceIdentity({
        kind: 'profile',
        profileSource: 'u',
        profileId: '123',
        search: profileSearch,
      }),
    ).not.toBe(columnSourceIdentity({ kind: 'profile', profileSource: 'u', profileId: '123' }))
    expect(columnSourceIdentity({ kind: 'search-entry' })).toBe('["search-entry"]')
    expect(
      columnSourceIdentity({
        kind: 'explore',
        groupId: '102803',
        label: '不会进入唯一标识',
      }),
    ).toBe(columnSourceIdentity({ kind: 'explore', groupId: '102803' }))
    expect(columnSourceTitle({ kind: 'home', tab: 'following' })).toBe('用户分组')
    expect(columnSourceTitle({ kind: 'explore', groupId: '102803', label: '热门' })).toBe('热门')
  })

  it('inherits a resized width when adding another column of the same kind', async () => {
    const storage = createStorageArea()
    const ids = ['first-column', 'second-column']
    const store = createWorkspaceStore(storage, {
      createId: () => ids.shift() ?? 'fallback-column',
    })

    await store.getState().addColumn({ kind: 'explore' })
    await store.getState().setColumnWidth('first-column', 640)
    await store.getState().addColumn({ kind: 'explore' })
    await store.getState().addColumn({ kind: 'topic', topic: '不同类型' })

    expect(store.getState().auxiliaryColumns).toEqual([
      { id: 'first-column', source: { kind: 'explore' }, width: 640 },
      { id: 'second-column', source: { kind: 'explore' }, width: 640 },
      { id: 'fallback-column', source: { kind: 'topic', topic: '不同类型' } },
    ])
  })

  it('forgets resized widths so columns follow the settings width again', async () => {
    const storage = createStorageArea()
    const ids = ['first-column', 'second-column']
    const store = createWorkspaceStore(storage, {
      createId: () => ids.shift() ?? 'fallback-column',
    })

    await store.getState().addColumn({ kind: 'explore' })
    await store.getState().setColumnWidth('first-column', 640)
    await store.getState().resetColumnWidths()
    await store.getState().addColumn({ kind: 'explore' })

    expect(store.getState().columnWidths).toEqual({})
    expect(store.getState().auxiliaryColumns).toEqual([
      { id: 'first-column', source: { kind: 'explore' } },
      { id: 'second-column', source: { kind: 'explore' } },
    ])
  })

  it('clamps persisted and resized widths to the supported range', async () => {
    const storage = createStorageArea({
      version: 1,
      auxiliaryColumns: [{ id: 'column', source: { kind: 'explore' }, width: 9999 }],
      focusedColumnId: null,
      columnWidths: { explore: 1 },
    })
    const store = createWorkspaceStore(storage)
    await store.getState().hydrate()

    expect(store.getState().auxiliaryColumns[0]).toMatchObject({ width: 720 })
    expect(store.getState().columnWidths).toEqual({ explore: 300 })
    await store.getState().setColumnWidth('column', 1000)
    expect(store.getState().auxiliaryColumns[0]).toMatchObject({ width: 720 })
    expect(store.getState().columnWidths).toEqual({ explore: 720 })
  })

  it('migrates legacy saved width aliases for newly added saved columns', async () => {
    const store = createWorkspaceStore(
      createStorageArea({
        version: 1,
        auxiliaryColumns: [],
        focusedColumnId: null,
        columnWidths: { favorites: 600 },
      }),
      { createId: () => 'saved-column' },
    )
    await store.getState().hydrate()
    await store.getState().addColumn({ kind: 'saved', uid: '1', tab: 'favorites' })

    expect(store.getState().auxiliaryColumns[0]).toMatchObject({ width: 600 })
  })

  it('adds duplicate source columns as independent instances', async () => {
    const storage = createStorageArea()
    const ids = ['first-column', 'second-column']
    const store = createWorkspaceStore(storage, {
      createId: () => ids.shift() ?? 'generated-column',
    })

    const firstId = await store.getState().addColumn({ kind: 'explore' })
    const duplicateId = await store.getState().addColumn({ kind: 'explore' })

    expect(firstId).toBe('first-column')
    expect(duplicateId).toBe('second-column')
    expect(store.getState().auxiliaryColumns).toEqual([
      { id: 'first-column', source: { kind: 'explore' } },
      { id: 'second-column', source: { kind: 'explore' } },
    ])
    expect(store.getState().focusedColumnId).toBe('second-column')
  })

  it('persists enablement, order, focus and removals without primary-column state', async () => {
    const ids = ['first-column', 'second-column']
    const storage = createStorageArea()
    const store = createWorkspaceStore(storage, {
      createId: () => ids.shift() ?? 'fallback-column',
    })

    await store.getState().addColumn({ kind: 'explore', groupId: '102803', label: '热门' })
    await store.getState().addColumn({ kind: 'hot-search', type: 'social' })
    await store.getState().moveColumn('second-column', 0)
    await store.getState().focusColumn('first-column')
    await store.getState().removeColumn('first-column')

    expect(store.getState()).toMatchObject({
      auxiliaryColumns: [{ id: 'second-column' }],
      focusedColumnId: null,
    })
    expect(storage.set).toHaveBeenLastCalledWith({
      [WORKSPACE_STORAGE_KEY]: {
        version: 1,
        auxiliaryColumns: [
          {
            id: 'second-column',
            source: { kind: 'hot-search', type: 'social' },
          },
        ],
        focusedColumnId: null,
      },
    })
  })

  it('merges writes from stores that hydrated the same snapshot', async () => {
    const storage = createStorageArea()
    const firstStore = createWorkspaceStore(storage, { createId: () => 'first-column' })
    const secondStore = createWorkspaceStore(storage, { createId: () => 'second-column' })
    await Promise.all([firstStore.getState().hydrate(), secondStore.getState().hydrate()])

    await Promise.all([
      firstStore.getState().addColumn({ kind: 'home', tab: 'for-you' }),
      secondStore.getState().addColumn({ kind: 'hot-search', type: 'social' }),
    ])

    const reloadedStore = createWorkspaceStore(storage)
    await reloadedStore.getState().hydrate()
    expect(reloadedStore.getState().auxiliaryColumns).toEqual([
      { id: 'first-column', source: { kind: 'home', tab: 'for-you' } },
      { id: 'second-column', source: { kind: 'hot-search', type: 'social' } },
    ])
  })

  it('supports an explicit default width when no per-kind width exists', async () => {
    const store = createWorkspaceStore(createStorageArea(), { createId: () => 'column' })
    await store.getState().addColumn({ kind: 'explore' }, 610)
    expect(store.getState().auxiliaryColumns[0]).toMatchObject({ width: 610 })
  })

  it('keeps in-memory state unchanged when persistence fails', async () => {
    const storage: AppSettingsStorageArea = {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {
        throw new Error('storage unavailable')
      }),
    }
    const store = createWorkspaceStore(storage)

    await expect(store.getState().addColumn({ kind: 'home', tab: 'for-you' })).rejects.toThrow(
      'storage unavailable',
    )
  })

  it('applies external local-storage snapshots and unregisters the listener', () => {
    const store = createWorkspaceStore(createStorageArea())
    let listener:
      | ((changes: Record<string, { newValue?: unknown }>, areaName: string) => void)
      | undefined
    const storageChanges = {
      addListener: vi.fn((nextListener) => {
        listener = nextListener
      }),
      removeListener: vi.fn(),
    }
    const cleanup = bindWorkspaceStorageSync(store, storageChanges)

    listener?.(
      {
        [WORKSPACE_STORAGE_KEY]: {
          newValue: {
            version: 1,
            auxiliaryColumns: [{ id: 'search-column', source: { kind: 'search-entry' } }],
            focusedColumnId: 'search-column',
          },
        },
      },
      'local',
    )

    expect(store.getState()).toMatchObject({
      auxiliaryColumns: [{ id: 'search-column', source: { kind: 'search-entry' } }],
      focusedColumnId: 'search-column',
    })
    cleanup()
    expect(storageChanges.removeListener).toHaveBeenCalledWith(listener)
  })
})
