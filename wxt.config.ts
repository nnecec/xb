import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'wxt'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: 'xb',
    description: 'xb rewrites weibo.com into a cleaner X-like reading experience',
    icons: {
      16: 'icon/logo-16.png',
      32: 'icon/logo-32.png',
      48: 'icon/logo-48.png',
      128: 'icon/logo-128.png',
    },
    permissions: ['storage'],
    host_permissions: ['https://weibo.com/*', 'https://www.weibo.com/*'],
    web_accessible_resources: [
      {
        resources: ['weibo-main-world.js'],
        matches: ['https://weibo.com/*', 'https://www.weibo.com/*'],
      },
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
})
