import "../assets/global.css";

import { createRoot, type Root } from "react-dom/client";
import { createShadowRootUi } from "wxt/utils/content-script-ui/shadow-root";
import { defineContentScript } from "wxt/utils/define-content-script";
import { injectScript } from "wxt/utils/inject-script";

import { AppRoot } from "@/features/weibo/app/app-root";
import { createPageStore, type PageStore } from "@/features/weibo/app/page-store";
import { bindShellState } from "@/features/weibo/content/shell-state";
import { markWeiboPageReady } from "@/features/weibo/content/page-takeover";
import { waitForWeiboHostRegions } from "@/features/weibo/content/host-selectors";
import { getAppSettingsStore } from "@/lib/app-settings-store";

interface MountedWeiboUi {
  pageStore: PageStore;
  root: Root;
  cleanup: () => void;
}

export default defineContentScript({
  matches: ["https://weibo.com/*", "https://www.weibo.com/*"],
  runAt: "document_idle",
  cssInjectionMode: "ui",
  async main(ctx) {
    await injectScript("/weibo-main-world.js", { keepInDom: true });

    const regions = await waitForWeiboHostRegions(document);
    if (!regions) {
      markWeiboPageReady();
      return;
    }
    const settingsStore = getAppSettingsStore();
    await settingsStore.getState().hydrate();

    const ui = await createShadowRootUi(ctx, {
      name: "loveforxb-shell",
      position: "inline",
      anchor: "body",
      append: "first",
      onMount(container) {
        const pageStore = createPageStore();
        const cleanup = bindShellState({
          container,
          appRoot: regions.appRoot,
          settingsStore,
        });
        const root = createRoot(container);
        root.render(<AppRoot pageStore={pageStore} />);
        return { cleanup, pageStore, root };
      },
      onRemove(mounted?: MountedWeiboUi) {
        mounted?.cleanup();
        mounted?.pageStore.dispose();
        mounted?.root.unmount();
      },
    });

    ui.mount();
  },
});
