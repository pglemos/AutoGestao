import * as React from 'react'

export type MxSurfaceVisualMode = 'default' | 'manager'

const MxSurfaceVisualContext = React.createContext<MxSurfaceVisualMode>('default')

export function MxSurfaceVisualProvider({
  mode,
  children,
}: {
  mode: MxSurfaceVisualMode
  children: React.ReactNode
}) {
  return (
    <MxSurfaceVisualContext.Provider value={mode}>
      {children}
    </MxSurfaceVisualContext.Provider>
  )
}

export function useMxSurfaceVisualMode() {
  return React.useContext(MxSurfaceVisualContext)
}
