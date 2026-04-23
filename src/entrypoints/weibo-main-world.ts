import { installHistoryBridge } from '@/lib/weibo/inject/install-history-bridge'

export default defineUnlistedScript(() => {
  installHistoryBridge(window)
})
