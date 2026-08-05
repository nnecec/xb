# Task 2 实现报告

## 改动

- 仅将 `variant="card"` 且设置为 `horizontal` 的多媒体带迁移到 Embla；inline/grid、PhotoView 灯箱和 VideoPlayer 保持原 API 与行为。
- 使用 `embla-carousel-react@8.6.0`、`embla-carousel-wheel-gestures@8.1.0`，配置 `axis: 'x'`、`align: 'start'`、`dragFree`、`containScroll: 'trimSnaps'`、`loop: false`；通过 `select`/`reInit` 同步选中索引，键盘使用 `scrollTo`。
- 采用 Embla `pointerDown`/`pointerUp` 状态，结合本地 5px click guard；移除旧 scrollLeft/pointer capture 拖动实现。横向触摸设置 `touch-action: pan-y`。
- slide 宽度按 `cardStripHeight * mediaRatio` 设置，保留 8px gap；图片使用 `motion/react` 的 0.98 按压缩放。`useReducedMotion` 时关闭按压、dragFree 与拖拽。
- wheel 插件不设置 `forceWheelAxis`，让插件按手势主轴判定，避免普通垂直滚轮被强制转成横向；`wheelDraggingClass` 为空。

## TDD / 测试

- 先运行现有行为测试确认迁移后 RED，再将断言迁移为 Embla API 契约，并补充拖拽释放、点击保护、布局切换和 reduced-motion 回归覆盖。
- `bun run compile` ✅
- `bun run lint` ✅
- 聚焦 `image-carousel.test.tsx`：17/17 ✅
- 完整 `bun run test:unit` ✅
- `bun run build` ✅（仅有现有第三方 CommonJS 警告）
- 独立复审：PASS。复审指出真实 wheel 事件和混合视频组合仍缺少专门用例，属于 P2 覆盖缺口，不影响本次实现；Embla 配置契约和现有媒体分支已覆盖。

## 文件

- `package.json`, `bun.lock`
- `src/lib/weibo/components/image-carousel.tsx`
- `src/test/setup.ts`

## 自审 / 疑虑

- Embla Hook 始终按稳定顺序初始化，仅在 horizontal 元素挂载 `emblaRef`；非 horizontal 不激活实例。
- 由于 jsdom 无布局，测试通过 mock Embla API 观察 `scrollTo` 调用和 `select` 状态；浏览器中的真实惯性与回弹由 Embla/插件负责。
- wheel 插件不强制轴向，普通垂直滚动由主轴判定保留；横向/Shift/触控板横向手势交给 Embla。
