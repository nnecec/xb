# Design System: xb

文档地图：设计 token、组件样例与完整 `rules` / `dos` / `donts` 见 **`DESIGN.json`**。产品 WHY 见 `PRODUCT.md`。实现与设置见 `src/lib/app-settings.ts`、`components/ui/`。

## North Star: The Silent Canvas

界面为内容让路：默认层中性、扁平、系统字体；色彩仅在交互时出现（评论蓝、转发绿、点赞玫红）。不是微博原版，也不是 SaaS 仪表盘。

**两层：**

- **Default layer** — 产品默认体验：Silent Canvas、无品牌色、克制动效、系统 UI 字体。
- **Preference layer** — 用户自选主题/字体/背景/页面可见性/Feed 模式/工具栏；不得反向污染默认设计决策。

## Colors

- 默认无品牌主色；中性色与功能色定义见 `DESIGN.json` → `colors`（OKLCH）。
- **交互才上色** — 蓝/绿/玫红仅用于 hover/active；静止界面保持无彩。
- **不用纯 `#000` / `#fff`** — 使用 JSON 中的 OKLCH 中性色；暗色边框优先 `oklch(1 0 0 / 10%)`。
- **主题 containment** — 自定义变量经主题系统注入 shadow UI，禁止组件内散落一次性色值。

## Typography & Elevation

- 默认 `system-ui` 栈；层级优先 **字重**（400→600）而非放大字号。用户字体仅走设置路径，Chrome 可降级。
- **扁平默认** — 卡片无阴影，靠 canvas/surface 明度差分层；`shadow-sm` 仅用于「重写已暂停」等浮层。第三层表面约 `oklch(0.94 0 0)`。

## Layout & Chrome

- 三栏：左导航（可折叠为图标轨）→ 主 Feed → 可选右栏（热搜/超话可独立隐藏）。
- 粘性 Tab 可用 `backdrop-blur`；其余避免玻璃态默认化。

## Component Deviations (vs shadcn defaults)

实现以代码为准；以下为默认层必须遵守的偏差：

| 区域           | 要点                                                                                                                                                                                                                                    |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **微博卡片**   | root 与 quoted 共用作者、正文、媒体、操作栏骨架；root 使用细边框 `border-border/70`，quoted 使用中性内嵌表面、无边框、无阴影、无彩色侧线；quoted 间距紧一级，窄屏取消额外水平缩进；两者复用三列操作栏，不添加 quoted 专属入场或布局动效 |
| **Action bar** | 三列 ghost；hover 色与 PRODUCT 一致；点赞为唯一可持久上色；`active:scale-[0.96]`；次要工具进 toolbar/更多，不争主操作                                                                                                                   |
| **Feed 模式**  | X：卡片进详情、评论独立；Weibo：卡片内可展开精选评论（见 `feedInteractionMode`）                                                                                                                                                        |
| **Rating**     | Feed 只读徽章；hover/profile 可编辑；容器保持中性；失败不挡流                                                                                                                                                                           |
| **Settings**   | Dialog 左栏分组 + 右面板；复杂项（主题编辑、操作排序）可堆叠字段                                                                                                                                                                        |
| **Motion**     | 仅 `transform` / `opacity`；`ease-out`，无 bounce；不动画 layout 属性                                                                                                                                                                   |

## Rules (default layer)

**Do：** OKLCH · 静止无彩 · 系统字体 · 明度分层 · 三栏布局 · 操作栏三色 hover 一致 · 评分/下载/生图视觉次要 · 设置页是控制面板不是营销页。

**Don't：** 默认品牌 accent · 纯黑白 token · 卡片/容器 drop shadow · 渐变字 · 彩色侧条边框 · 强制加载 UI 字体 · 滥用 glassmorphism · 仪表盘式重复卡片网格 · 流程首选弹窗 · 增强功能压过 Feed。

完整条文与 HTML/CSS 参考：`DESIGN.json` → `narrative.rules`、`narrative.dos`、`narrative.donts`、`components`。
