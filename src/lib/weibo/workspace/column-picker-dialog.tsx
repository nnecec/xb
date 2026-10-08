import { skipToken, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import {
  exploreGroupsQueryOptions,
  followGroupsQueryOptions,
  loadProfileHoverCard,
} from '@/lib/weibo/data/weibo-data'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'
import type { WeiboPageDescriptor } from '@/lib/weibo/route/page-descriptor'
import { parseProfileSearchUrlState } from '@/lib/weibo/route/profile-search-params'
import {
  columnSourceIdentity,
  columnSourceTitle,
  type ColumnSource,
  useWorkspace,
} from '@/lib/weibo/workspace/workspace-store'

interface ColumnOption {
  source: ColumnSource
}

const HOME_COLUMN_OPTIONS: ColumnOption[] = [
  { source: { kind: 'home', tab: 'for-you' } },
  { source: { kind: 'home', tab: 'following' } },
  { source: { kind: 'home', tab: 'special-follow' } },
  { source: { kind: 'home', tab: 'friend-circle' } },
]

const NOTIFICATION_COLUMN_OPTIONS: ColumnOption[] = [
  { source: { kind: 'notifications', tab: 'mentions' } },
  { source: { kind: 'notifications', tab: 'comments' } },
  { source: { kind: 'notifications', tab: 'likes' } },
]

const HOT_SEARCH_COLUMN_OPTIONS: ColumnOption[] = [
  { source: { kind: 'hot-search', type: 'hot' } },
  { source: { kind: 'hot-search', type: 'mine' } },
  { source: { kind: 'hot-search', type: 'entertainment' } },
  { source: { kind: 'hot-search', type: 'life' } },
  { source: { kind: 'hot-search', type: 'social' } },
]

const DEFAULT_EXPLORE_COLUMN_OPTION: ColumnOption = {
  source: { kind: 'explore', groupId: '102803', label: '热门' },
}

function withSavedColumns(
  catalog: readonly ColumnOption[],
  saved: readonly ColumnOption[],
  matches: (source: ColumnSource) => boolean,
): ColumnOption[] {
  const seen = new Set(catalog.map((option) => columnSourceIdentity(option.source)))
  const extras = saved.filter(
    (option) => matches(option.source) && !seen.has(columnSourceIdentity(option.source)),
  )
  return [...catalog, ...extras]
}

function ColumnOptionGroup({
  label,
  options,
  addedColumnIdByIdentity,
  onAdd,
  onRemove,
}: {
  label: string
  options: ColumnOption[]
  addedColumnIdByIdentity: ReadonlyMap<string, string>
  onAdd: (option: ColumnOption) => void
  onRemove: (columnId: string) => void
}) {
  if (options.length === 0) return null

  return (
    <section className="flex flex-col" aria-labelledby={`column-group-${label}`}>
      <h3
        id={`column-group-${label}`}
        className="text-muted-foreground px-1 pt-1 pb-1 text-xs font-medium"
      >
        {label}
      </h3>
      <ul className="divide-border/60 divide-y">
        {options.map((option) => {
          const identity = columnSourceIdentity(option.source)
          const title = columnSourceTitle(option.source)
          const columnId = addedColumnIdByIdentity.get(identity)
          const isAdded = columnId !== undefined
          return (
            <li key={identity} className="flex items-center justify-between gap-3 px-1 py-2">
              <span className="min-w-0 truncate text-sm">{title}</span>
              <Switch
                checked={isAdded}
                aria-label={title}
                onCheckedChange={(checked) => {
                  if (checked) onAdd(option)
                  else if (columnId) onRemove(columnId)
                }}
              />
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function ColumnPickerDialog({
  open,
  onOpenChange,
  primaryPage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  primaryPage: WeiboPageDescriptor
}) {
  const auxiliaryColumns = useWorkspace((state) => state.auxiliaryColumns)
  const addColumn = useWorkspace((state) => state.addColumn)
  const removeColumn = useWorkspace((state) => state.removeColumn)
  const followGroupsQuery = useQuery({ ...followGroupsQueryOptions, enabled: open })
  const exploreGroupsQuery = useQuery({ ...exploreGroupsQueryOptions, enabled: open })
  const primaryProfileLookup =
    primaryPage.kind === 'profile'
      ? primaryPage.profileSource === 'u'
        ? { uid: primaryPage.profileId }
        : { screenName: primaryPage.profileId }
      : null
  const primaryProfileQuery = useQuery({
    queryKey: ['weibo', 'column-picker', 'profile', primaryPage],
    queryFn: primaryProfileLookup ? () => loadProfileHoverCard(primaryProfileLookup) : skipToken,
    enabled: open && primaryProfileLookup !== null,
  })
  const savedOptions = useMemo<ColumnOption[]>(
    () => auxiliaryColumns.map((column) => ({ source: column.source })),
    [auxiliaryColumns],
  )
  const addedColumnIdByIdentity = useMemo(() => {
    const ids = new Map<string, string>()
    for (const column of auxiliaryColumns) {
      ids.set(columnSourceIdentity(column.source), column.id)
    }
    return ids
  }, [auxiliaryColumns])
  const groupOptions = useMemo<ColumnOption[]>(
    () =>
      (followGroupsQuery.data?.groups ?? []).map((group) => ({
        source: { kind: 'home', tab: 'following', groupId: group.gid, label: group.title },
      })),
    [followGroupsQuery.data?.groups],
  )
  const exploreOptions = useMemo<ColumnOption[]>(() => {
    const groups = exploreGroupsQuery.data ?? []
    if (groups.length === 0) return [DEFAULT_EXPLORE_COLUMN_OPTION]
    return groups.map((group) => ({
      source: { kind: 'explore', groupId: group.gid, label: group.title },
    }))
  }, [exploreGroupsQuery.data])
  const currentUserOptions = useMemo<ColumnOption[]>(() => {
    const uid = getCurrentUserUid()
    if (!uid) return []
    return [{ source: { kind: 'favorites', uid } }, { source: { kind: 'liked', uid } }]
  }, [])
  const currentPageOptions = useMemo<ColumnOption[]>(() => {
    if (primaryPage.kind === 'profile') {
      const search = parseProfileSearchUrlState(new URLSearchParams(window.location.search))
      return [
        {
          source: {
            kind: 'profile',
            profileId: primaryPage.profileId,
            profileSource: primaryPage.profileSource,
            ...(primaryProfileQuery.data?.name ? { label: primaryProfileQuery.data.name } : {}),
            ...(search.active ? { search } : {}),
          },
        },
      ]
    }
    if (primaryPage.kind === 'topic') {
      return [{ source: { kind: 'topic', topic: primaryPage.topic } }]
    }
    if (primaryPage.kind === 'follow') {
      return [
        {
          source: { kind: 'follow', uid: primaryPage.uid, tab: primaryPage.tab },
        },
      ]
    }
    return []
  }, [primaryPage, primaryProfileQuery.data])

  const handleAdd = async (option: ColumnOption) => {
    try {
      await addColumn(option.source)
    } catch {
      toast.error('无法保存列配置')
    }
  }

  const handleRemove = async (columnId: string) => {
    try {
      await removeColumn(columnId)
    } catch {
      toast.error('无法保存列配置')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>列管理</DialogTitle>
          <DialogDescription>每种来源对应一列。打开即添加，关闭即移除。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <ColumnOptionGroup
            label="首页"
            options={withSavedColumns(
              HOME_COLUMN_OPTIONS,
              savedOptions,
              (source) => source.kind === 'home' && !source.groupId,
            )}
            addedColumnIdByIdentity={addedColumnIdByIdentity}
            onAdd={(option) => void handleAdd(option)}
            onRemove={(columnId) => void handleRemove(columnId)}
          />
          <ColumnOptionGroup
            label="用户分组"
            options={withSavedColumns(
              groupOptions,
              savedOptions,
              (source) => source.kind === 'home' && Boolean(source.groupId),
            )}
            addedColumnIdByIdentity={addedColumnIdByIdentity}
            onAdd={(option) => void handleAdd(option)}
            onRemove={(columnId) => void handleRemove(columnId)}
          />
          <ColumnOptionGroup
            label="探索"
            options={withSavedColumns(
              exploreOptions,
              savedOptions,
              (source) => source.kind === 'explore',
            )}
            addedColumnIdByIdentity={addedColumnIdByIdentity}
            onAdd={(option) => void handleAdd(option)}
            onRemove={(columnId) => void handleRemove(columnId)}
          />
          <ColumnOptionGroup
            label="当前页面"
            options={withSavedColumns(
              currentPageOptions,
              savedOptions,
              (source) =>
                source.kind === 'profile' || source.kind === 'topic' || source.kind === 'follow',
            )}
            addedColumnIdByIdentity={addedColumnIdByIdentity}
            onAdd={(option) => void handleAdd(option)}
            onRemove={(columnId) => void handleRemove(columnId)}
          />
          <ColumnOptionGroup
            label="我的内容"
            options={withSavedColumns(
              currentUserOptions,
              savedOptions,
              (source) => source.kind === 'favorites' || source.kind === 'liked',
            )}
            addedColumnIdByIdentity={addedColumnIdByIdentity}
            onAdd={(option) => void handleAdd(option)}
            onRemove={(columnId) => void handleRemove(columnId)}
          />
          <ColumnOptionGroup
            label="通知"
            options={withSavedColumns(
              NOTIFICATION_COLUMN_OPTIONS,
              savedOptions,
              (source) => source.kind === 'notifications',
            )}
            addedColumnIdByIdentity={addedColumnIdByIdentity}
            onAdd={(option) => void handleAdd(option)}
            onRemove={(columnId) => void handleRemove(columnId)}
          />
          <ColumnOptionGroup
            label="热搜"
            options={withSavedColumns(
              HOT_SEARCH_COLUMN_OPTIONS,
              savedOptions,
              (source) => source.kind === 'hot-search',
            )}
            addedColumnIdByIdentity={addedColumnIdByIdentity}
            onAdd={(option) => void handleAdd(option)}
            onRemove={(columnId) => void handleRemove(columnId)}
          />
          <ColumnOptionGroup
            label="其他"
            options={withSavedColumns(
              [
                { source: { kind: 'search-entry' } },
                { source: { kind: 'history' } },
                { source: { kind: 'followed-super-topics' } },
              ],
              savedOptions,
              (source) =>
                source.kind === 'search-entry' ||
                source.kind === 'history' ||
                source.kind === 'followed-super-topics',
            )}
            addedColumnIdByIdentity={addedColumnIdByIdentity}
            onAdd={(option) => void handleAdd(option)}
            onRemove={(columnId) => void handleRemove(columnId)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
