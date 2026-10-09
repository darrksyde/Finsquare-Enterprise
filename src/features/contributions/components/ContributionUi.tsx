import type { ReactNode } from "react"
import { ErrorState, LoadingState } from "@/components/feedback/AsyncState"
import { ActionMenu, Badge, Disclosure } from "@/components/ui"
import { HandCoins, Landmark } from "@/icons"
import type { View } from "@/types"
import { useContributions } from "../hooks/useContributions"
import { CONTRIBUTION_ORG_ID } from "../constants"
import { recipientHoldsFunds, recipientHolderName } from "../domain/contribution.rules"
import type {
  ContributionForm,
  ContributionFrequency,
  ContributionRecipient,
  ContributionStatus,
  ContributionType,
  ParticipantState,
  PeriodState,
  WithdrawalStatus,
} from "../types/contribution.types"

export { ActionModal, KV, NumField, PagedTable, Panel, Stats, Tabs, TextArea } from "@/features/loans/components/LoanUi"
export { ActionMenu, Disclosure }

type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "purple"

export interface ContributionPageProps {
  view: View
  navigate: (view: View, id?: string) => void
  notify: (message: string) => void
  id?: string
}

export type ContributionCtx = ContributionPageProps &
  Omit<ReturnType<typeof useContributions>, "data" | "error"> & {
    data: NonNullable<ReturnType<typeof useContributions>["data"]>
  }

/**
 * Loads the contribution workspace and hands it to the page.
 *
 * The shell deliberately renders no header and no module tab row: each page owns
 * exactly one header through `ShellPage`, so a detail screen can never show the
 * module's navigation on top of its own.
 */
export function ContributionPage({
  children,
  ...props
}: ContributionPageProps & { children: (ctx: ContributionCtx) => ReactNode }) {
  const resource = useContributions(CONTRIBUTION_ORG_ID)
  if (resource.error) return <ErrorState message={resource.error} retry={resource.retry} />
  if (!resource.data) return <LoadingState label="Loading contributions…" />

  const { data, ...rest } = resource
  return <>{children({ ...props, ...rest, data } as ContributionCtx)}</>
}

export function ModeBanner({ mode, environment }: { mode: "live" | "simulated" | "blocked"; environment: string }) {
  if (mode === "live") return null
  return (
    <div className="contribution-banner" data-mode={mode} role="status">
      <Landmark size={15} />
      <span>
        {mode === "simulated"
          ? "Demo Mode — contributions, payouts and commissions are recorded but no real money moves."
          : `Environment is ${environment.replace("_", " ")} — contributions can be configured, but money movement is disabled.`}
      </span>
    </div>
  )
}

const typeTones: Record<ContributionType, Tone> = { Fixed: "blue", Flexible: "neutral", Target: "amber" }
export const ContributionTypeBadge = ({ type }: { type: ContributionType }) => <Badge tone={typeTones[type]}>{type}</Badge>

const formTones: Record<ContributionForm, Tone> = { General: "neutral", Personal: "purple" }
export const ContributionFormBadge = ({ form }: { form: ContributionForm }) => <Badge tone={formTones[form]}>{form}</Badge>

const frequencyTones: Record<ContributionFrequency, Tone> = { Daily: "blue", Weekly: "blue", Monthly: "blue", Custom: "purple", None: "neutral" }
export const FrequencyBadge = ({ contribution }: { contribution: { frequency: ContributionFrequency; frequencyBased: boolean; customFrequency?: { label: string } } }) => {
  if (!contribution.frequencyBased) return <Badge tone="neutral">No frequency</Badge>
  const label = contribution.frequency === "Custom" ? contribution.customFrequency?.label ?? "Custom" : contribution.frequency
  return <Badge tone={frequencyTones[contribution.frequency]}>{label}</Badge>
}

const statusTones: Record<ContributionStatus, Tone> = { Active: "green", Paused: "amber", Completed: "blue", Closed: "neutral" }
export const ContributionStatusBadge = ({ status }: { status: ContributionStatus }) => <Badge tone={statusTones[status]}>{status}</Badge>

const withdrawalTones: Record<WithdrawalStatus, Tone> = {
  Completed: "green", "Pending approval": "amber", Approved: "blue", Scheduled: "purple", Rejected: "red", Failed: "red",
}
export const WithdrawalStatusBadge = ({ status }: { status: WithdrawalStatus }) => <Badge tone={withdrawalTones[status]}>{status}</Badge>

const periodTones: Record<PeriodState, Tone> = { Paid: "green", Expected: "neutral", Missed: "red", Late: "amber", "Partially Paid": "amber" }
export const PeriodStateBadge = ({ state }: { state: PeriodState }) => <Badge tone={periodTones[state]}>{state}</Badge>

const participantTones: Record<ParticipantState, Tone> = { "On track": "green", Behind: "amber", Completed: "blue" }
export const ParticipantStateBadge = ({ state }: { state: ParticipantState }) => <Badge tone={participantTones[state]}>{state}</Badge>

/**
 * "Where does this money go?" in one calm line for a page header — the recipient
 * is part of what the record *is*, so it belongs in the header rather than in a
 * block of its own.
 */
export function RecipientNote({ recipient }: { recipient: ContributionRecipient }) {
  return (
    <span className="meta-note">
      <HandCoins size={14} />
      {recipientHoldsFunds(recipient)
        ? `Held for ${recipientHolderName(recipient)}`
        : `Held in ${recipientHolderName(recipient)}`}
    </span>
  )
}

