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
    await store.getState().setRewriteEnabled(false)
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangleIcon className="text-destructive size-5" />
                xb 遇到错误
              </CardTitle>
              <CardAction>
                <Button variant="destructive" size="sm" onClick={this.handleExitXb}>
                  退出 xb
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                xb 扩展遇到了一个错误，页面可能无法正常显示。
              </p>
              {this.state.error && (
                <pre className="bg-destructive/10 text-destructive max-h-32 overflow-auto rounded-md p-2 text-xs">
                  {this.state.error.message}
                </pre>
              )}
              <p className="text-muted-foreground text-xs">
                点击「退出 xb」按钮将禁用 xb 扩展并刷新页面。
              </p>
            </CardContent>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
