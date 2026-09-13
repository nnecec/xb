import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

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

export function useColumnPageRefresh(refresh: () => void, isRefreshing: boolean) {
  const context = useContext(ColumnPageChromeApiContext)

  useLayoutEffect(() => {
    if (!context?.active) return
    const token = Symbol('column-page-refresh')
    context.setRegistration(token, refresh, isRefreshing)
    return () => context.clearRegistration(token)
  }, [context, isRefreshing, refresh])
}
