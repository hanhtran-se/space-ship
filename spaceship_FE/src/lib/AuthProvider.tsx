import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, authToken, setUnauthorizedHandler } from './api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(() => authToken.get() !== null)

  // Any admin request answered with 401 sends the owner back to the login screen.
  useEffect(() => {
    setUnauthorizedHandler(() => setSignedIn(false))
    return () => setUnauthorizedHandler(() => {})
  }, [])

  const signIn = useCallback(async (username: string, password: string) => {
    authToken.set(username, password)
    try {
      await api.me()
      setSignedIn(true)
    } catch (error) {
      authToken.clear()
      throw error
    }
  }, [])

  const signOut = useCallback(() => {
    authToken.clear()
    setSignedIn(false)
  }, [])

  const value = useMemo(() => ({ signedIn, signIn, signOut }), [signedIn, signIn, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
