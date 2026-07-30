import { AlertTriangleIcon } from 'lucide-react'
import * as React from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getAppSettingsStore } from '@/lib/app-settings-store'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: React.ReactNode
}

export class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  handleExitXb = async () => {
    const store = getAppSettingsStore()
    await store.getState().updateSettings({ rewriteEnabled: false })
    window.location.reload()
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangleIcon className="text-destructive size-5" />
                xb 暂时无法显示页面
              </CardTitle>
              <CardAction>
                <Button variant="destructive" size="sm" onClick={this.handleExitXb}>
                  停用 xb 并刷新
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                xb 运行时出错，当前页面可能无法继续使用。
              </p>
              {this.state.error && (
                <pre className="bg-destructive/10 text-destructive max-h-32 overflow-auto rounded-md p-2 text-xs">
                  {this.state.error.message}
                </pre>
              )}
              <p className="text-muted-foreground text-xs">
                停用 xb 后会刷新页面，并回到微博原始界面。
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
