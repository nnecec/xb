const WEIBO_TIME_ZONE = 'Asia/Shanghai'
const DAY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: WEIBO_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const TIME_FORMATTER = new Intl.DateTimeFormat('en-GB', {
  timeZone: WEIBO_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/**
 * Parse Weibo API date string: "Tue Apr 08 10:00:00 +0800 2026"
 * Converts the serialized Weibo timestamp into an absolute Date.
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

function getFormatterParts(formatter: Intl.DateTimeFormat, date: Date): Record<string, string> {
  return Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  )
}

function getDayKey(date: Date): string {
  const { year, month, day } = getFormatterParts(DAY_FORMATTER, date)
  return `${year}-${month}-${day}`
}

function formatTime(date: Date): string {
  const { hour, minute } = getFormatterParts(TIME_FORMATTER, date)
  return `${hour}:${minute}`
}

export function formatCreatedAt(dateStr: string): string {
  const date = parseWeiboDate(dateStr)
  if (!date || isNaN(date.getTime())) {
    return ''
  }

  const todayKey = getDayKey(new Date())
  const createdDayKey = getDayKey(date)

  if (createdDayKey === todayKey) {
    return formatTime(date)
  }

  const yesterdayKey = getDayKey(new Date(Date.now() - 24 * 60 * 60 * 1000))
  if (createdDayKey === yesterdayKey) {
    return `昨天 ${formatTime(date)}`
  }

  return `${createdDayKey} ${formatTime(date)}`
}
