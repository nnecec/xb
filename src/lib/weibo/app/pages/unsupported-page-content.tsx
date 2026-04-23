import { useAppShellContext } from '@/lib/weibo/app/app-shell-layout'
import { UnsupportedPageCard } from '@/lib/weibo/app/app-shell-layout'

export function UnsupportedPageContent() {
  const ctx = useAppShellContext()

  return <UnsupportedPageCard page={ctx.page} />
}
