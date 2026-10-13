import { Landmark } from "@/icons"
import type { MoneyMovementMode } from "@/lib/permissions/capabilities"

/**
 * Shown inside a module while money cannot move — either the corporate account is not connected
 * yet, or the workspace is suspended. Renders nothing once movement is live.
 */
export function EnvironmentNotice({ mode }: { mode: MoneyMovementMode }) {
  if (mode === "live") return null
  return (
    <div className="env-notice" data-mode={mode} role="status">
      <Landmark size={15} />
      <span>
        {mode === "simulated"
          ? "Money movement is not enabled yet. Connect your corporate account to start moving money."
          : "This workspace is suspended. Money movement is unavailable until it is restored."}
      </span>
    </div>
  )
}
