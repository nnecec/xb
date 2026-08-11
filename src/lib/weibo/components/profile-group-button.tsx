import { useMutation, useQuery } from '@tanstack/react-query'
import { Globe2, Lock, Plus, Users } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import {
  profileAssignedGroupsQueryOptions,
  profileAvailableGroupsQueryOptions,
} from '@/lib/weibo/data/weibo-data'
import { createProfileGroup, setProfileGroups } from '@/lib/weibo/data/weibo-data'
import type { ProfileFollowGroup } from '@/lib/weibo/models/profile'
import { getCurrentUserUid } from '@/lib/weibo/platform/current-user'

interface ProfileGroupButtonProps {
  uid: string
  following: boolean
  size?: 'icon-sm' | 'icon-lg'
}

function getGroupIds(groups: ProfileFollowGroup[]) {
  return groups.map((group) => group.id)
}

function getGroupModeLabel(mode: string | null) {
  return mode === 'public' ? '公开' : '隐藏'
}

function getGroupModeIcon(mode: string | null) {
  return mode === 'public' ? Globe2 : Lock
}

function ProfileGroupForm({
  uid,
  assignedGroups,
  availableGroups,
  onOpenChange,
}: {
  uid: string
  assignedGroups: ProfileFollowGroup[]
  availableGroups: ProfileFollowGroup[]
  onOpenChange: (open: boolean) => void
}) {
  const originIds = getGroupIds(assignedGroups)
  const [selectedIds, setSelectedIds] = useState(() => new Set(originIds))
  const [createOpen, setCreateOpen] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupOpen, setNewGroupOpen] = useState(true)
  const mutation = useMutation({
    mutationFn: () => setProfileGroups(uid, Array.from(selectedIds), originIds),
    meta: {
      invalidates: [
        ['weibo', 'profile'],
        ['weibo', 'profile-hover'],
        ['weibo', 'profile', 'groups', uid],
        ['weibo', 'follow-groups'],
      ],
    },
    onSuccess: () => {
      toast.success('分组已更新')
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '设置分组失败')
    },
  })
  const createGroupMutation = useMutation({
    mutationFn: () => createProfileGroup(newGroupName.trim(), newGroupOpen),
    meta: {
      invalidates: [
        ['weibo', 'profile', 'groups', uid],
        ['weibo', 'follow-groups'],
      ],
    },
    onSuccess: () => {
      toast.success('分组已创建')
      setNewGroupName('')
      setNewGroupOpen(true)
      setCreateOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : '创建分组失败')
    },
  })

  const handleCheckedChange = (groupId: string, checked: boolean) => {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (checked) {
        next.add(groupId)
      } else {
        next.delete(groupId)
      }
      return next
    })
  }

  const isCreateDisabled = createGroupMutation.isPending || newGroupName.trim().length === 0
  const isBusy = mutation.isPending || createGroupMutation.isPending

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">分组</p>
            <p className="text-muted-foreground text-xs">勾选后点击保存生效</p>
          </div>
          <Button
            type="button"
            variant={createOpen ? 'secondary' : 'outline'}
            size="sm"
            disabled={isBusy}
            onClick={() => setCreateOpen((value) => !value)}
          >
            <Plus data-icon="inline-start" />
            新建分组
          </Button>
        </div>

        {createOpen ? (
          <div className="bg-muted/30 flex flex-col gap-3 rounded-lg border p-3">
            <div className="flex gap-2">
              <Input
                id={`profile-new-group-${uid}`}
                aria-label="新分组名称"
                value={newGroupName}
                disabled={isBusy}
                onChange={(event) => setNewGroupName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !isCreateDisabled) {
                    createGroupMutation.mutate()
                  }
                }}
                placeholder="输入分组名"
              />
              <Button
                type="button"
                variant="secondary"
                disabled={isCreateDisabled}
                onClick={() => createGroupMutation.mutate()}
              >
                {createGroupMutation.isPending ? '创建中…' : '创建'}
              </Button>
            </div>
            <Label
              htmlFor={`profile-new-group-open-${uid}`}
              className="text-muted-foreground justify-between rounded-md text-xs"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-foreground text-sm font-medium">公开分组</span>
                <span>公开后别人可以看到这个分组</span>
              </span>
              <Switch
                id={`profile-new-group-open-${uid}`}
                checked={newGroupOpen}
                disabled={isBusy}
                onCheckedChange={setNewGroupOpen}
              />
            </Label>
          </div>
        ) : null}

        {availableGroups.length === 0 ? (
          <Empty className="min-h-32 border">
            <EmptyHeader>
              <EmptyTitle>暂无可用分组</EmptyTitle>
              <EmptyDescription>点击新建分组后创建第一个分组。</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
            {availableGroups.map((group) => {
              const checkboxId = `profile-group-${uid}-${group.id}`
              const ModeIcon = getGroupModeIcon(group.mode)
              return (
                <Label
                  key={group.id}
                  htmlFor={checkboxId}
                  className="hover:bg-muted/55 has-data-[state=checked]:border-border has-data-[state=checked]:bg-muted/45 flex min-h-14 cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2.5 py-2 transition-colors"
                >
                  <Checkbox
                    id={checkboxId}
                    aria-label={group.name}
                    checked={selectedIds.has(group.id)}
                    disabled={isBusy}
                    onCheckedChange={(checked) => handleCheckedChange(group.id, checked === true)}
                  />
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-sm font-medium">{group.name}</span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <Badge variant={group.mode === 'public' ? 'secondary' : 'outline'}>
                        <ModeIcon data-icon="inline-start" />
                        {getGroupModeLabel(group.mode)}
                      </Badge>
                      <Badge variant="outline">
                        <Users data-icon="inline-start" />
                        {group.memberCount ?? 0}
                      </Badge>
                    </span>
                  </span>
                </Label>
              )
            })}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          disabled={isBusy}
          onClick={() => onOpenChange(false)}
        >
          取消
        </Button>
        <Button type="button" disabled={isBusy} onClick={() => mutation.mutate()}>
          {mutation.isPending ? '保存中…' : '保存'}
        </Button>
      </DialogFooter>
    </>
  )
}

function ProfileGroupDialogContent({
  uid,
  open,
  onOpenChange,
}: {
  uid: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const assignedGroupsQuery = useQuery(profileAssignedGroupsQueryOptions(uid, open))
  const availableGroupsQuery = useQuery(profileAvailableGroupsQueryOptions(uid, open))
  const assignedGroups = assignedGroupsQuery.data ?? []
  const availableGroups = availableGroupsQuery.data ?? []
  const isLoading = assignedGroupsQuery.isPending || availableGroupsQuery.isPending
  const error = assignedGroupsQuery.error ?? availableGroupsQuery.error

  const handleRetry = () => {
    void assignedGroupsQuery.refetch()
    void availableGroupsQuery.refetch()
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>关注分组</DialogTitle>
        <DialogDescription>设置此用户所属的关注分组。</DialogDescription>
      </DialogHeader>

      {isLoading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : error ? (
        <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-sm">
          <p className="text-muted-foreground">
            {error instanceof Error ? error.message : '无法加载分组'}
          </p>
          <Button type="button" size="sm" variant="outline" onClick={handleRetry}>
            重试
          </Button>
        </div>
      ) : (
        <ProfileGroupForm
          key={`${uid}:${getGroupIds(assignedGroups).join(',')}`}
          uid={uid}
          assignedGroups={assignedGroups}
          availableGroups={availableGroups}
          onOpenChange={onOpenChange}
        />
      )}
    </DialogContent>
  )
}

export function ProfileGroupButton({ uid, following, size = 'icon-lg' }: ProfileGroupButtonProps) {
  const [open, setOpen] = useState(false)
  const currentUid = getCurrentUserUid()
  const isSelf = currentUid !== null && currentUid === uid

  if (!following || isSelf) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="secondary" size={size} aria-label="分组" title="分组">
          <Users aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <ProfileGroupDialogContent uid={uid} open={open} onOpenChange={setOpen} />
    </Dialog>
  )
}
