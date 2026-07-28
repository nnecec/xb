# Task 1 report — progress-capable download primitive

## 改动

- `downloadAsZip` 增加可选的第三参数 `onProgress`，保持原有两参数调用兼容。
- 导出 `DownloadProgress` / `DownloadProgressCallback`：每个媒体项完成（成功或失败）报告 `{ stage: 'downloading', completed, total }`，ZIP 生成前报告 `{ stage: 'generating-zip' }`。
- `DownloadZipResult` 在存在部分失败时附带 `failedUrls: MediaUrl[]`，保留成功文件并让调用方可只重试失败媒体；全成功结果维持原有可枚举字段。
- 进度回调异常会被隔离，不影响下载流程。
- 增加聚焦回归测试覆盖进度顺序、失败媒体返回及回调异常隔离。

## 测试

- `bun run test:unit src/lib/weibo/utils/download-media.test.ts` — 1 file, 24 tests passed。
- `bun run compile` — passed (`tsc --noEmit`)。

## Spec compliance verdict

PASS — callback is backward-compatible and item-count based; download and ZIP generation are distinct stages; failed media entries are returned for retry; UI and unrelated files were not modified.

## Quality verdict

PASS — focused tests and TypeScript compilation pass; progress callbacks are guarded so observability cannot break downloads.

## Commit SHA

`a6efd1b796fe72dc68e5d164aa02922a522e8b67`

## Concerns

- Event stage strings and `failedUrls` naming are the contract for Task 2 (`'downloading'` / `'generating-zip'`, `MediaUrl[]`).
- If all resources fail, existing behavior still throws `所有资源下载失败` (no result is returned), so retry-all-failed remains outside this primitive's result path.
