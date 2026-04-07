import { defineUnlistedScript } from 'wxt/utils/define-unlisted-script'

import { installHistoryBridge } from '@/features/weibo/inject/install-history-bridge'

export default defineUnlistedScript(() => {
  installHistoryBridge(window)
})
