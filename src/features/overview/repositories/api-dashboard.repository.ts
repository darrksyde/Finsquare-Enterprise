import { apiClient, endpoints } from "@/services/api"
import type { DashboardCustomer, DashboardInput } from "../domain/dashboard"
import type { DashboardRepository } from "./dashboard.repository"

/** The MFI backend's `/dashboard` payload, after the client unwraps `{ success, data }`. */
interface MfiDashboardDTO {
  totalCustomers: number
  customersAwaitingApproval: number
  totalApplications: number
  pendingApplications: number
  activeLoans: number
  overdueLoans: number
  totalDisbursed: string
  totalRepaid: string
  repaymentRate: string
  activeEsusu: number
  esusuCollected: string
  walletApprovalsPending: number
  staffAwaitingSetup: number
  walletConnected: boolean
  latestCustomers: Array<{
    id: string
    name: string
    status: string
    joinedAt: string
  }>
}

const toNumber = (value: string | number): number =>
  typeof value === "number" ? value : Number.parseFloat(value || "0")

function mapCustomer(customer: MfiDashboardDTO["latestCustomers"][number]): DashboardCustomer {
  return {
    id: customer.id,
    name: customer.name,
    status: customer.status,
    // The backend sends an ISO timestamp; the panel shows a date.
    joinedAt: customer.joinedAt
      ? new Date(customer.joinedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
      : "",
  }
}

/**
 * Maps the MFI portfolio stats onto the MFI dashboard.
 *
 * One request supplies every figure the backend can answer; the backend owns the aggregation so the
 * dashboard never fans out to several endpoints.
 */
function mapDashboard(dto: MfiDashboardDTO): DashboardInput {
  const totalDisbursed = toNumber(dto.totalDisbursed)
  const totalRepaid = toNumber(dto.totalRepaid)
  return {
    customerCount: dto.totalCustomers,
    customersAwaitingApproval: dto.customersAwaitingApproval,
    activeLoans: dto.activeLoans,
    overdueLoans: dto.overdueLoans,
    totalApplications: dto.totalApplications,
    pendingApplications: dto.pendingApplications,
    totalDisbursed,
    totalRepaid,
    repaymentRate: toNumber(dto.repaymentRate),
    activeEsusu: dto.activeEsusu,
    esusuCollected: toNumber(dto.esusuCollected),
    walletApprovalsPending: dto.walletApprovalsPending,
    staffAwaitingSetup: dto.staffAwaitingSetup,
    walletConnected: dto.walletConnected,
    latestCustomers: dto.latestCustomers.map(mapCustomer),
  }
}

/** API-backed dashboard, reading the MFI backend's `/dashboard` aggregate. */
export class ApiDashboardRepository implements DashboardRepository {
  async load(): Promise<DashboardInput> {
    return mapDashboard(await apiClient.get<MfiDashboardDTO>(endpoints.dashboard))
  }
}
