import { useCallback, useEffect, useState } from 'react'
import { errorText } from './format'

type State<T> = { data: T | undefined; error: string | undefined; loading: boolean }

/**
 * Loads data on mount and whenever `load` changes. Pass a stable function
 * (a module-level reference or one wrapped in useCallback).
 */
export function useQuery<T>(load: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({
    data: undefined,
    error: undefined,
    loading: true,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    load().then(
      (data) => {
        if (active) setState({ data, error: undefined, loading: false })
      },
      (error: unknown) => {
        if (active) setState((s) => ({ data: s.data, error: errorText(error), loading: false }))
      },
    )
    return () => {
      active = false
    }
  }, [load, version])

  const reload = useCallback(() => setVersion((v) => v + 1), [])
  return { ...state, reload }
}
