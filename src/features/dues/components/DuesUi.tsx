import type { ReactNode } from "react"
import { ErrorState, LoadingState } from "@/components/feedback/AsyncState"
import { ActionMenu, Badge, Button, Disclosure } from "@/components/ui"
import type { View } from "@/types"
import { useDues } from "../hooks/useDues"
import { DUES_ORG_ID } from "../constants"
import { frequencyLabel } from "../domain/schedule"
import type {
  DuesLienState,
  DuesParticipantState,
  DuesPaymentStatus,
  DuesPlan,
  DuesPlanStatus,
} from "../types/dues.types"
/** Shared loan/contribution primitives — tables, panels, stats, modals and exports are reused, never rebuilt. */
export {
  ActionModal,
  ExportButtons,
  KV,
  NumField,
  PagedTable,
  Panel,
  Stats,
  Tabs,
  TextArea,
} from "@/features/loans/components/LoanUi"
export { ActionMenu, Button, Disclosure }
type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "purple"
export interface DuesPageProps {
  view: View
  navigate: (view: View, id?: string) => void
  notify: (message: string) => void
  id?: string
}
export type DuesCtx = DuesPageProps &
  Omit<ReturnType<typeof useDues>, "data" | "error"> & {
    data: NonNullable<ReturnType<typeof useDues>["data"]>
  }
/**
 * Loads the dues workspace and hands it to the page.
 *
 * The shell renders no header and no tab row of its own: each page owns exactly one header through
 * `ShellPage`, so a detail screen can never show the module's navigation on top of its own.
 */
export function DuesPage({
  children,
  ...props
}: DuesPageProps & {
  children: (ctx: DuesCtx) => ReactNode
}) {
  const resource = useDues(DUES_ORG_ID)
  if (resource.error) return <ErrorState message={resource.error} retry={resource.retry} />
  if (!resource.data) return <LoadingState label="Loading dues…" />
  const { data, ...rest } = resource
  return <>{children({ ...props, ...rest, data } as DuesCtx)}</>
}
const planTones: Record<DuesPlanStatus, Tone> = {
  Active: "green",
  Paused: "amber",
  Closed: "neutral",
}
export const DuesStatusBadge = ({ status }: { status: DuesPlanStatus }) => (
  <Badge tone={planTones[status]}>{status}</Badge>
)
export const DuesFrequencyBadge = ({ plan }: { plan: Pick<DuesPlan, "frequency" | "customFrequency"> }) => (
  <Badge tone={plan.frequency === "One-time" ? "purple" : "blue"}>{frequencyLabel(plan)}</Badge>
)
const paymentTones: Record<DuesPaymentStatus, Tone> = {
  "Awaiting wallet recovery": "purple",
  Overdue: "red",
  "Partially paid": "amber",
  Paid: "green",
  Pending: "neutral",
}
export const ChargeStatusBadge = ({ status }: { status: DuesPaymentStatus }) => (
  <Badge tone={paymentTones[status]}>{status}</Badge>
)
const lienTones: Record<DuesLienState, Tone> = {
  None: "neutral",
  Pending: "amber",
  "Partially recovered": "amber",
  Recovered: "green",
  Cancelled: "neutral",
}
export const LienStateBadge = ({ state }: { state: DuesLienState }) => {
  if (state === "None") return <span className="contribution-sub">No lien</span>
  return <Badge tone={lienTones[state]}>{state}</Badge>
}
const participantTones: Record<DuesParticipantState, Tone> = {
  "Paid up": "green",
  "Partially paid": "amber",
  Behind: "red",
  "Awaiting wallet recovery": "purple",
}
export const ParticipantStateBadge = ({ state }: { state: DuesParticipantState }) => (
  <Badge tone={participantTones[state]}>{state}</Badge>
)
