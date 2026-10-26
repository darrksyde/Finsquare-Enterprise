import type { DashboardInput } from "../domain/dashboard"

/**
 * The figures the overview dashboard renders.
 *
 * The mock source aggregates the feature stores; the API source reads the MFI backend's
 * `/dashboard` statistics. The page renders whichever `DashboardData` the selected source produces.
 */
export interface DashboardRepository {
  load(): Promise<DashboardInput>
}
