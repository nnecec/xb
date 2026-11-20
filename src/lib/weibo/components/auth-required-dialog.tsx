import { LogIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface AuthRequiredDialogProps {
  open: boolean
  onLogin: () => void
}

export function AuthRequiredDialog({ open, onLogin }: AuthRequiredDialogProps) {
  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LogIn />
            需要登录微博
          </DialogTitle>
          <DialogDescription>
            xb 没有检测到微博登录状态。登录后刷新当前页面，即可继续使用 xb。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onLogin} className="w-full sm:w-auto">
            前往微博登录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
