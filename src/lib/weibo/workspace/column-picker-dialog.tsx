import { skipToken, useQuery } from '@tanstack/react-query'
import { Check, Plus } from 'lucide-react'
import { useMemo } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

function ColumnOptionGroup({
  label,
  options,
  addedSourceIdentities,
  onAdd,
}: {
  label: string
  options: ColumnOption[]
  addedSourceIdentities: ReadonlySet<string>
  onAdd: (option: ColumnOption) => void
}) {
  if (options.length === 0) return null

  return (
    <section className="flex flex-col gap-2" aria-labelledby={`column-group-${label}`}>
      <h3 id={`column-group-${label}`} className="text-muted-foreground text-xs font-medium">
        {label}
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => {
          const identity = columnSourceIdentity(option.source)
          const title = columnSourceTitle(option.source)
          const isAdded = addedSourceIdentities.has(identity)
          return (
            <Button
              key={identity}
              type="button"
              variant="outline"
              className="justify-start"
              disabled={isAdded}
              onClick={() => onAdd(option)}
            >
              {isAdded ? <Check data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
              <span className="truncate">{title}</span>
              {isAdded ? <span className="sr-only">，已添加</span> : null}
            </Button>
          )
        })}
      </div>
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
  const addedSourceIdentities = useMemo(
    () => new Set(auxiliaryColumns.map((column) => columnSourceIdentity(column.source))),
    [auxiliaryColumns],
  )
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
  }, [primaryPage, primaryProfileQuery.data?.name])

  const handleAdd = async (option: ColumnOption) => {
    try {
      await addColumn(option.source)
      onOpenChange(false)
    } catch {
      toast.error('无法保存列配置')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>添加列</DialogTitle>
          <DialogDescription>每种完整来源只能添加一次；已添加的来源会保持禁用。</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-5">
          <ColumnOptionGroup
            label="首页"
            options={HOME_COLUMN_OPTIONS}
            addedSourceIdentities={addedSourceIdentities}
            onAdd={(option) => void handleAdd(option)}
          />
          <ColumnOptionGroup
            label="用户分组"
            options={groupOptions}
            addedSourceIdentities={addedSourceIdentities}
            onAdd={(option) => void handleAdd(option)}
          />
          <ColumnOptionGroup
            label="探索"
            options={exploreOptions}
            addedSourceIdentities={addedSourceIdentities}
            onAdd={(option) => void handleAdd(option)}
          />
          <ColumnOptionGroup
            label="当前页面"
            options={currentPageOptions}
            addedSourceIdentities={addedSourceIdentities}
            onAdd={(option) => void handleAdd(option)}
          />
          <ColumnOptionGroup
            label="我的内容"
            options={currentUserOptions}
            addedSourceIdentities={addedSourceIdentities}
            onAdd={(option) => void handleAdd(option)}
          />
          <ColumnOptionGroup
            label="通知"
            options={NOTIFICATION_COLUMN_OPTIONS}
            addedSourceIdentities={addedSourceIdentities}
            onAdd={(option) => void handleAdd(option)}
          />
          <ColumnOptionGroup
            label="热搜"
            options={HOT_SEARCH_COLUMN_OPTIONS}
            addedSourceIdentities={addedSourceIdentities}
            onAdd={(option) => void handleAdd(option)}
          />
          <ColumnOptionGroup
            label="其他"
            options={[
              { source: { kind: 'search-entry' } },
              { source: { kind: 'history' } },
              { source: { kind: 'followed-super-topics' } },
            ]}
            addedSourceIdentities={addedSourceIdentities}
            onAdd={(option) => void handleAdd(option)}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
