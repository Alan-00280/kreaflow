'use client'

import { createContext, useContext, ReactNode } from 'react'

export interface Session {
  id: string
  name: string
  role: string
}

const SessionContext = createContext<Session | null>(null)

export function SessionProvider({ session, children }: { session: Session | null; children: ReactNode }) {
  return (
    <SessionContext.Provider value={session}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  return context
}
