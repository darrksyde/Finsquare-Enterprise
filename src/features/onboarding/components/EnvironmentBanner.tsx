import { Button } from "@/components/ui"
import { Landmark } from "@/icons"
import type { OrganizationEnvironment } from "@/types"

/**
 * The strip above the workspace while it is not fully live: the corporate account is not connected,
 * is under review, or the workspace is suspended. Renders nothing once the environment is live.
 */
export default function EnvironmentBanner({
  environment,
  onAction,
}: {
  environment: OrganizationEnvironment
  onAction: () => void
}) {
  if (environment === "live") return null

  const copy =
    environment === "suspended"
      ? {
          title: "This workspace is suspended.",
          note: "Money movement and member operations are unavailable until it is restored.",
          action: "View status",
        }
      : environment === "pending_review"
        ? {
            title: "Your corporate account is under review.",
            note: "Live money movement is enabled as soon as verification is complete.",
            action: "View status",
          }
        : {
            title: "Finish setting up your workspace.",
            note: "Connect your corporate account to enable live money movement.",
            action: "Complete account setup",
          }

  return (
    <div className="env-banner" role="status">
      <Landmark size={14} />
      <span className="env-banner-text">
        <b>{copy.title}</b> <span className="env-banner-note">{copy.note}</span>
      </span>
      <Button variant="secondary" onClick={onAction}>{copy.action}</Button>
    </div>
  )
}
