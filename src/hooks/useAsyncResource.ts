import { useCallback, useEffect, useState } from "react"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import type { AsyncStatus } from "@/types"

export function useAsyncResource<T>(
  loader: () => Promise<T>,
  dependencies: readonly unknown[],
) {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<AsyncStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const retry = useCallback(() => setVersion((value) => value + 1), [])

  useEffect(() => {
    let active = true
    loader()
      .then((result) => {
        if (!active) return
        setData(result)
        setStatus("success")
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(getUserErrorMessage(reason))
        setStatus("error")
      })
    return () => {
      active = false
    }
    // The caller controls refresh dependencies; loader identity is intentionally ignored.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, version])

  return { data, status, error, retry, refresh: retry }
}
