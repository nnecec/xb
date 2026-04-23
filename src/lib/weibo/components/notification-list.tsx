import { PageEmptyState } from '@/lib/weibo/components/page-state'
import type { NotificationItem } from '@/lib/weibo/models/notification'

import { NotificationCard } from './notification-card'

export function NotificationList({
  items,
  emptyLabel,
}: {
  items: NotificationItem[]
  emptyLabel: string
}) {
  if (items.length === 0) {
    return <PageEmptyState label={emptyLabel} />
  }

  return items.map((item) => <NotificationCard key={item.id} item={item} />)
}
