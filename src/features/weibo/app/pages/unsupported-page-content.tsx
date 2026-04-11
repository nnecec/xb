import { useAppShellContext } from '@/features/weibo/app/app-shell-layout'
import { UnsupportedPageCard } from '@/features/weibo/app/app-shell-layout'

export function UnsupportedPageContent() {
  const ctx = useAppShellContext()

  return <UnsupportedPageCard page={ctx.page} />
}
