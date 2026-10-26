import { useMemo } from "react"
import { useAsyncResource } from "@/hooks/useAsyncResource"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { dashboardService } from "../services/dashboard.service"
import {
  attentionItems,
  dashboardMetrics,
  eyebrowFor,
  greetingFor,
  isEmptyCommunity,
  type DashboardData,
  type DashboardInput,
} from "../domain/dashboard"

/**
 * The overview dashboard backed by the MFI backend's `/dashboard` aggregate.
 *
 * One request supplies every figure and the latest customers — the backend owns the aggregation, so
 * the dashboard never fans out to several endpoints.
 */
export function useApiDashboard(): DashboardData {
  const organizationId = useOrganizationId()
  const { data, status, error, retry } = useAsyncResource<DashboardInput>(
    () => dashboardService.load(),
    [organizationId],
  )

  const { eyebrow, greeting } = useMemo(() => {
    const opened = new Date()
    return { eyebrow: eyebrowFor(opened), greeting: greetingFor(opened.getHours()) }
    // The community is the dependency on purpose: switching community re-reads the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId])

  const metrics = useMemo(() => (data ? dashboardMetrics(data) : []), [data])
  const attention = useMemo(() => (data ? attentionItems(data) : []), [data])
  const hasNoRecords = data ? isEmptyCommunity(data) : false

  return {
    status: status === "success" ? "success" : status === "error" ? "error" : "loading",
    error,
    retry,
    metrics,
    attention,
    latestCustomers: data?.latestCustomers ?? [],
    hasNoRecords,
    eyebrow,
    greeting,
  }
}
