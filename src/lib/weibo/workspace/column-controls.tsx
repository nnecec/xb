import { createContext, type ReactNode, useContext } from 'react'

const ColumnControlsContext = createContext<ReactNode>(null)

export function ColumnControlsProvider({
  children,
  controls,
}: {
  children: ReactNode
  controls: ReactNode
}) {
  return (
    <ColumnControlsContext.Provider value={controls}>{children}</ColumnControlsContext.Provider>
  )
}

export function useColumnControls(): ReactNode {
  return useContext(ColumnControlsContext)
}
