# xb

🥷 xb - Make weibo X-liked and simpler.

[中文](./README.cn.md)

![preview](./assets/weibo.com_1783497251_QArOv1yd0.jpeg)

xb strips away the noise and gives you a focused, distraction-free reading
experience — similar to X (Twitter).

xb runs directly in your browser. Once installed, simply browse Weibo as usual
and enjoy the beautifully redesigned interface.

Visit [Landing Page](https://xb-extension.vercel.app/) for more.

## Install

[Chrome Web Store](https://chromewebstore.google.com/detail/xb/ffhppkcianllofhhjohbfbobjfppbeao)

## Release

- Pushes to `main` automatically evaluate release eligibility.
- Use Conventional Commits so `semantic-release` can determine the next version.
- Only `feat`, `fix`, `perf`, and breaking changes produce a release.
- Before enabling the workflow, bootstrap the existing version with:

```bash
git tag v0.0.5
git push origin v0.0.5
```

- Configure these GitHub repository secrets before the first automated release:
  `CHROME_EXTENSION_ID`, `CHROME_CLIENT_ID`, `CHROME_CLIENT_SECRET`,
  `CHROME_REFRESH_TOKEN`, `FIREFOX_EXTENSION_ID`, `FIREFOX_JWT_ISSUER`,
  `FIREFOX_JWT_SECRET`.

## Features

1. ✨ **X like Style** — Clean, reading-first
2. 🔓 **Fully Open Source** — No privacy concerns
3. 🎯 **Focus on Reading** — Distraction-free feed
4. 🚫 **No Interruptions** — No stickers, ads, or supertopics

## Supported Pages

xb currently enhances the following pages:

- [x] Home Timeline
- [x] Profile Page
- [x] Weibo Detail
- [x] Notifications
- [x] Favorites
- [ ] Explore/Search
- [ ] Hot Timeline

## Credits

- Inspired by [BewlyBewly](https://github.com/BewlyBewly/BewlyBewly)
- [Linux Do](https://linux.do/)
