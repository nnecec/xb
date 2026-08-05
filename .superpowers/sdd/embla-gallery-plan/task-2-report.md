# Task 2 实现报告

## 改动

- 仅将 `variant="card"` 且设置为 `horizontal` 的多媒体带迁移到 Embla；inline/grid、PhotoView 灯箱和 VideoPlayer 保持原 API 与行为。
- 使用 `embla-carousel-react@8.6.0`、`embla-carousel-wheel-gestures@8.1.0`，配置 `axis: 'x'`、`align: 'start'`、`dragFree`、`containScroll: 'trimSnaps'`、`loop: false`；通过 `select`/`reInit` 同步选中索引，键盘使用 `scrollTo`。
- 采用 Embla `pointerDown`/`pointerUp` 状态，结合本地 5px click guard；移除旧 scrollLeft/pointer capture 拖动实现。横向触摸设置 `touch-action: pan-y`。
- slide 宽度按 `cardStripHeight * mediaRatio` 设置，保留 8px gap；图片使用 `motion/react` 的 0.98 按压缩放。`useReducedMotion` 时关闭按压、dragFree 与拖拽。
- wheel 插件不设置 `forceWheelAxis`，让插件按手势主轴判定，避免普通垂直滚轮被强制转成横向；`wheelDraggingClass` 为空。

## TDD / 测试

- 先运行现有行为测试确认迁移后 RED；随后完成 Embla 代码并补齐 IntersectionObserver 测试桩。
- `bun run compile` ✅
- `bun run lint` ✅
- 聚焦 `image-carousel.test.tsx`：8/14 通过；6 个旧测试仍断言已删除的原生 scrollLeft/pointer-capture 行为，需改写为 Embla API 契约（键盘/选中索引/drag click guard）。
- 完整单元测试、build 尚未运行（聚焦测试中的旧断言需先更新）。

## 文件

- `package.json`, `bun.lock`
- `src/lib/weibo/components/image-carousel.tsx`
- `src/test/setup.ts`

## 自审 / 疑虑

- Embla Hook 始终按稳定顺序初始化，仅在 horizontal 元素挂载 `emblaRef`；非 horizontal 不激活实例。
- 由于 jsdom 无布局，Embla 实际 `scrollTo` 的 scrollLeft 无法由旧测试验证；新测试应 mock/use Embla API 观察调用和 `select` 状态。
- wheel 插件不强制轴向，普通垂直滚动由主轴判定保留；横向/Shift/触控板横向手势交给 Embla。
