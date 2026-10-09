import { Badge } from "@/components/ui"
import type { BranchStatus } from "@/types"

export function BranchStatusBadge({ status }: { status: BranchStatus }) {
  return (
    <Badge
      tone={
        status === "active"
          ? "green"
          : status === "archived"
            ? "neutral"
            : "amber"
      }
    >
      {status.toUpperCase()}
    </Badge>
  )
}
