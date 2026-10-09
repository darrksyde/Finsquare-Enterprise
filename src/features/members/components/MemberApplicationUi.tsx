import { Badge } from "@/components/ui"
import type { MemberApplicationStatus, MemberJoinMode } from "../types/member-application.types"

type Tone = "green" | "blue" | "amber" | "red" | "neutral"

const STATUS_TONES: Record<MemberApplicationStatus, Tone> = {
  Submitted: "amber",
  "Under Review": "blue",
  Approved: "green",
  Rejected: "red",
}

export function ApplicationStatusBadge({ status }: { status: MemberApplicationStatus }) {
  return <Badge tone={STATUS_TONES[status]}>{status}</Badge>
}

export function JoinModeBadge({ mode }: { mode: MemberJoinMode }) {
  return <Badge tone={mode === "Open" ? "blue" : "neutral"}>{mode === "Open" ? "Open joining" : "Approval required"}</Badge>
}

/** Whether the shareable link is currently answering. */
export function LinkStateBadge({ live }: { live: boolean }) {
  return <Badge tone={live ? "green" : "neutral"}>{live ? "Link live" : "Link off"}</Badge>
}
