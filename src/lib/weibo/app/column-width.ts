import { COLUMN_WIDTH_PX, type ColumnWidth } from '@/lib/app-settings'

export function resolveColumnWidthPx(columnWidth: ColumnWidth, customColumnWidth: number) {
  if (columnWidth === 'custom') return customColumnWidth
  return COLUMN_WIDTH_PX[columnWidth]
}
