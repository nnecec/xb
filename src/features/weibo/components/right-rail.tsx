import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const TRENDS = ['设计系统', '前端工程化', '微博体验改写']

export function RightRail() {
  return (
    <div className="flex flex-col gap-4">
      <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Trends</CardTitle>
          <CardDescription>First-pass placeholder rail</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
          {TRENDS.map((trend) => (
            <div key={trend} className="rounded-2xl bg-muted px-3 py-3">
              {trend}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="rounded-[28px] border-border/70 bg-card/95 shadow-none">
        <CardHeader>
          <CardTitle className="text-base">Fallback</CardTitle>
          <CardDescription>Original Weibo remains reachable</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          More contextual modules land after the detail and profile pages are wired.
        </CardContent>
      </Card>
    </div>
  )
}
