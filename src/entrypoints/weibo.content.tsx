import "../assets/global.css";

import { createRoot, type Root } from "react-dom/client";
import { AppRoot } from "@/features/weibo/app/app-root";
import { bindShellState } from "@/features/weibo/content/shell-state";
import { markWeiboPageReady } from "@/features/weibo/content/page-takeover";
import { waitForWeiboHostRegions } from "@/features/weibo/content/host-selectors";
import { getAppSettingsStore } from "@/lib/app-settings-store";

interface MountedWeiboUi {
  root: Root;
  cleanup: () => void;
}

export let ui: ShadowRootContentScriptUi<MountedWeiboUi>;

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

    ui = await createShadowRootUi(ctx, {
      name: "xb-shell",
      position: "inline",
      anchor: "body",
      append: "first",
      onMount(container) {
        const cleanup = bindShellState({
          container,
          appRoot: regions.appRoot,
          settingsStore,
        });
        const root = createRoot(container);
        root.render(<AppRoot />);
        return { cleanup, root };
      },
      onRemove(mounted?: MountedWeiboUi) {
        mounted?.cleanup();
        mounted?.root.unmount();
      },
    });

    ui.mount();
  },
});
