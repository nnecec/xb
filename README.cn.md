# xb

🥷 xb - Make weibo X-liked and simpler.

[English](./README.md)

![preview](./assets/weibo.com_1783497251_QArOv1yd0.jpeg)

xb 帮你去除噪音，打造一个专注、无干扰的阅读体验——就像 X（Twitter）那样清爽。

xb 直接运行在你的浏览器中。安装后，正常浏览微博，就能享受到重新设计的优美界面。

查看[xb extension](https://xb-extension.vercel.app/)官方网站

## 安装

[Chrome 网上应用店](https://chromewebstore.google.com/detail/xb/ffhppkcianllofhhjohbfbobjfppbeao)

## 发布

- 推送到 `main` 后会自动检测是否需要 release。
- 提交信息请遵循 Conventional Commits，交给 `semantic-release` 自动计算版本。
- 只有 `feat`、`fix`、`perf` 和 breaking change 会触发正式发布。
- 首次启用前先补当前基线 tag：

```bash
git tag v0.0.5
git push origin v0.0.5
```

- 第一次自动发布前，需要在 GitHub 仓库里配置这些 Secrets：
  `CHROME_EXTENSION_ID`、`CHROME_CLIENT_ID`、`CHROME_CLIENT_SECRET`、
  `CHROME_REFRESH_TOKEN`、`FIREFOX_EXTENSION_ID`、`FIREFOX_JWT_ISSUER`、
  `FIREFOX_JWT_SECRET`。

## 功能特点

1. ✨ **X like 样式** — 简洁纯粹，阅读优先
2. 🔓 **完全开源** — 没有隐私担忧
3. 🎯 **聚焦阅读** — 信息流无干扰
4. 🚫 **无干扰** — 没有贴图、广告、超话

## 支持的页面

xb 现已为以下页面提供增强体验：

- [x] 首页时间线
- [x] 个人主页
- [x] 微博详情
- [x] 消息/通知
- [x] 收藏
- [ ] 搜索/探索
- [ ] 热搜

## 致谢

- 受 [BewlyBewly](https://github.com/BewlyBewly/BewlyBewly) 启发
- [Linux Do](https://linux.do/)
