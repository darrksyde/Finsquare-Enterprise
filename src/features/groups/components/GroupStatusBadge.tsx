import { Badge } from "@/components/ui"
import type { GroupStatus } from "@/types"

export function GroupStatusBadge({ status }: { status: GroupStatus }) {
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
