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
      enabled: false,
      auxiliaryColumns: [],
      focusedColumnId: null,
      isHydrated: true,
    })
  })

  it('hydrates a versioned auxiliary column snapshot', async () => {
    const storage = createStorageArea({
      version: 1,
      enabled: true,
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
      enabled: true,
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

  it('keeps valid columns while removing damaged and duplicate sources', async () => {
    const storage = createStorageArea({
      version: 1,
      enabled: true,
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
      enabled: true,
      auxiliaryColumns: [
        {
          id: 'following-column',
          source: { kind: 'home', tab: 'following' },
        },
        {
          id: 'explore-column',
          source: { kind: 'explore', groupId: '102803' },
        },
      ],
      focusedColumnId: null,
    })
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
    expect(columnSourceTitle({ kind: 'home', tab: 'following' })).toBe('我关注的')
    expect(columnSourceTitle({ kind: 'explore', groupId: '102803', label: '热门' })).toBe('热门')
  })

  it('adds a column once and focuses the existing column for a duplicate source', async () => {
    const storage = createStorageArea()
    const store = createWorkspaceStore(storage, {
      createId: () => 'generated-column',
    })

    const firstId = await store.getState().addColumn({ kind: 'home', tab: 'following' })
    const duplicateId = await store.getState().addColumn({ kind: 'home', tab: 'following' })

    expect(firstId).toBe('generated-column')
    expect(duplicateId).toBe('generated-column')
    expect(store.getState()).toMatchObject({
      auxiliaryColumns: [
        {
          id: 'generated-column',
          source: { kind: 'home', tab: 'following' },
        },
      ],
      focusedColumnId: 'generated-column',
    })
    expect(storage.set).toHaveBeenLastCalledWith({
      [WORKSPACE_STORAGE_KEY]: expect.objectContaining({
        version: 1,
        auxiliaryColumns: [expect.objectContaining({ id: 'generated-column' })],
      }),
    })
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
    await store.getState().setEnabled(true)
    await store.getState().removeColumn('first-column')

    expect(store.getState()).toMatchObject({
      enabled: true,
      auxiliaryColumns: [{ id: 'second-column' }],
      focusedColumnId: null,
    })
    expect(storage.set).toHaveBeenLastCalledWith({
      [WORKSPACE_STORAGE_KEY]: {
        version: 1,
        enabled: true,
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

  it('keeps in-memory state unchanged when persistence fails', async () => {
    const storage: AppSettingsStorageArea = {
      get: vi.fn(async () => ({})),
      set: vi.fn(async () => {
        throw new Error('storage unavailable')
      }),
    }
    const store = createWorkspaceStore(storage)

    await expect(store.getState().setEnabled(true)).rejects.toThrow('storage unavailable')
    expect(store.getState().enabled).toBe(false)
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
            enabled: true,
            auxiliaryColumns: [{ id: 'search-column', source: { kind: 'search-entry' } }],
            focusedColumnId: 'search-column',
          },
        },
      },
      'local',
    )

    expect(store.getState()).toMatchObject({
      enabled: true,
      auxiliaryColumns: [{ id: 'search-column', source: { kind: 'search-entry' } }],
      focusedColumnId: 'search-column',
    })
    cleanup()
    expect(storageChanges.removeListener).toHaveBeenCalledWith(listener)
  })
})
