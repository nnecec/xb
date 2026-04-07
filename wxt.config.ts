import { defineConfig } from 'wxt'
import tailwindcss from '@tailwindcss/vite'

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: 'LoveForXb',
    description: 'LoveForXb rewrites weibo.com into a cleaner X-like reading experience',
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
