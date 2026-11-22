import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { Button } from '@/components/ui/button'
import { RefreshCWIcon } from '@/components/ui/refresh-cw'
import { cn } from '@/lib/utils'

interface ColumnRefreshRegistration {
  token: symbol
  refresh: () => void
  isRefreshing: boolean
}

interface ColumnPageChromeApi {
  active: boolean
  setRegistration: (token: symbol, refresh: () => void, isRefreshing: boolean) => void
  clearRegistration: (token: symbol) => void
}

const ColumnPageChromeApiContext = createContext<ColumnPageChromeApi | null>(null)
const ColumnPageRefreshContext = createContext<ColumnRefreshRegistration | null>(null)

export function ColumnPageChromeProvider({
  active,
  children,
}: {
  active: boolean
  children: ReactNode
}) {
  const [registration, setRegistrationState] = useState<ColumnRefreshRegistration | null>(null)
  const setRegistration = useCallback(
    (token: symbol, refresh: () => void, isRefreshing: boolean) => {
      setRegistrationState({ token, refresh, isRefreshing })
    },
    [],
  )
  const clearRegistration = useCallback((token: symbol) => {
    setRegistrationState((current) => (current?.token === token ? null : current))
  }, [])
  const api = useMemo(
    () => ({ active, setRegistration, clearRegistration }),
    [active, clearRegistration, setRegistration],
  )

  return (
    <ColumnPageChromeApiContext.Provider value={api}>
      <ColumnPageRefreshContext.Provider value={registration}>
        {children}
      </ColumnPageRefreshContext.Provider>
    </ColumnPageChromeApiContext.Provider>
  )
}

export function useColumnPageToolbarActive(): boolean {
  return useContext(ColumnPageChromeApiContext)?.active ?? false
}

export function useColumnRefreshRegistration(): ColumnRefreshRegistration | null {
  return useContext(ColumnPageRefreshContext)
}

export function ColumnRefreshButton() {
  const registration = useColumnRefreshRegistration()
  if (!registration) return null
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="刷新"
      data-column-control
      onPointerDown={(event) => event.stopPropagation()}
      onClick={registration.refresh}
      disabled={registration.isRefreshing}
    >
      <RefreshCWIcon className={cn('size-3', registration.isRefreshing && 'animate-spin')} />
    </Button>
  )
}

export function useColumnPageRefresh(refresh: () => void, isRefreshing: boolean) {
  const context = useContext(ColumnPageChromeApiContext)

  useLayoutEffect(() => {
    if (!context?.active) return
    const token = Symbol('column-page-refresh')
    context.setRegistration(token, refresh, isRefreshing)
    return () => context.clearRegistration(token)
  }, [context, isRefreshing, refresh])
}
