import { useCallback, useEffect, useState } from "react"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import { memberApplicationsService } from "../services/member-applications.service"
import type { AsyncStatus } from "@/types"
import type { MemberApplicationDataset } from "../types/member-application.types"

/** The member application workspace: forms, applications and the service that owns the rules. */
export function useMemberApplications(organizationId: string) {
  const [data, setData] = useState<MemberApplicationDataset | null>(null)
  const [status, setStatus] = useState<AsyncStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => memberApplicationsService.subscribe(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    let active = true
    memberApplicationsService
      .load(organizationId)
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
  }, [organizationId, version])

  return {
    data,
    status,
    error,
    retry: useCallback(() => setVersion((v) => v + 1), []),
    service: memberApplicationsService,
  }
}
