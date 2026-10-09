import { Button } from "@/components/ui"
import { Landmark } from "@/icons"
import type { OrganizationEnvironment } from "@/types"

export default function DemoBanner({ environment, onAction }: { environment: OrganizationEnvironment; onAction: () => void }) {
  if (environment === "live") return null
  const review = environment === "pending_review"
  return (
    <div className="demo-banner" role="status">
      <Landmark size={14} />
      <span className="demo-banner-text">
        <b>{review ? "Corporate account under review." : "You're currently in Demo Mode."}</b>{" "}
        <span className="demo-banner-note">
          {review
            ? "Real financial operations will be enabled once your account is approved."
            : "Explore and configure FinSquare Enterprise. Complete your Corporate Account setup to enable real financial operations."}
        </span>
      </span>
      <Button variant="secondary" onClick={onAction}>{review ? "View status" : "Complete Account Setup"}</Button>
    </div>
  )
}
