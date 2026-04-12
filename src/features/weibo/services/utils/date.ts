import { format, isToday, isYesterday } from 'date-fns'

/**
 * Parse Weibo API date string: "Tue Apr 08 10:00:00 +0800 2026"
 * Converts from Weibo timezone (+0800) to local time.
 */
function parseWeiboDate(dateStr: string): Date | null {
  if (!dateStr) return null

  const parts = dateStr.trim().split(/\s+/)
  if (parts.length < 6) return null

  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]
  const monthIndex = months.indexOf(parts[1])
  if (monthIndex < 0) return null

  const day = parseInt(parts[2], 10)
  const [hours, minutes, seconds] = parts[3].split(':').map(Number)
  const year = parseInt(parts[5], 10)
  const tz = parts[4] // e.g. "+0800"
  const tzSign = tz[0] === '+' ? 1 : -1
  const tzH = parseInt(tz.slice(1, 3), 10)
  const tzM = parseInt(tz.slice(3, 5), 10)
  const tzOffsetMinutes = tzSign * (tzH * 60 + tzM)

  const utcDate = new Date(Date.UTC(year, monthIndex, day, hours, minutes, seconds))
  return new Date(utcDate.getTime() - tzOffsetMinutes * 60 * 1000)
}

export function formatCreatedAt(dateStr: string): string {
  const date = parseWeiboDate(dateStr)
  if (!date || isNaN(date.getTime())) {
    return ''
  }

  if (isToday(date)) {
    return format(date, 'HH:mm')
  }

  if (isYesterday(date)) {
    return `昨天 ${format(date, 'HH:mm')}`
  }

  return format(date, 'yyyy-MM-dd HH:mm')
}
