import "@/features/weibo/content/weibo-anti-flash.css";

import { defineContentScript } from "wxt/utils/define-content-script";

/**
 * Runs at document_start with page-level CSS only (tiny bundle).
 * Hides Weibo’s #app until the main weibo content script calls `markWeiboPageReady`.
 */
export default defineContentScript({
  matches: ["https://weibo.com/*", "https://www.weibo.com/*"],
  runAt: "document_start",
  main() {},
});
