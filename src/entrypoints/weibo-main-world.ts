import { installHistoryBridge } from '@/features/weibo/inject/install-history-bridge'

export default defineUnlistedScript(() => {
  installHistoryBridge(window)
})
