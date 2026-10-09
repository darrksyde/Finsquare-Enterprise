import { Badge } from "@/components/ui"
import type { AdministratorStatus } from "@/types"

export function AdministratorStatusBadge({
  status,
}: {
  status: AdministratorStatus
}) {
  return (
    <Badge
      tone={
        status === "active"
          ? "green"
          : status === "invited"
            ? "blue"
            : status === "suspended"
              ? "red"
              : "neutral"
      }
    >
      {status.toUpperCase()}
    </Badge>
  )
}
