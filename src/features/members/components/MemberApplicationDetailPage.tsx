import { useState } from "react"
import { CheckCircle2, X } from "@/icons"
import { ShellPage } from "@/components/layout/ShellPage"
import { Badge, Button } from "@/components/ui"
import { ErrorState, LoadingState } from "@/components/feedback/AsyncState"
import { ResponseSections } from "@/features/forms/components/ResponseSections"
import { ActionModal, KV, Panel, TextArea, fmtDate } from "@/features/loans/components/LoanUi"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { useMemberApplications } from "../hooks/useMemberApplications"
import { applicantEmail, applicantName, applicantPhone } from "../domain/member-application.rules"
import { applicationDecisionSchema } from "../schemas/member-application.schema"
import { ApplicationStatusBadge, JoinModeBadge } from "./MemberApplicationUi"
import type { View } from "@/types"

const ACTOR = "Admin User"

/**
 * One application. The answers are read-only and grouped by the step they were collected in, so
 * what the administrator reviews is exactly what the applicant submitted.
 */
export function MemberApplicationDetailPage({ applicationId, navigate, notify }: { applicationId: string; navigate: (view: View, id?: string) => void; notify: (message: string) => void }) {
  const organizationId = useOrganizationId()
  const { data, status, error, retry, service } = useMemberApplications(organizationId)
  const { can } = useAuthorization()
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)

  if (status === "loading" || status === "idle") return <LoadingState label="Loading application…" />
  if (status === "error" || !data) return <ErrorState message={error ?? "This application could not be loaded."} retry={retry} />

  const application = data.applications.find((item) => item.id === applicationId)
  const form = application && data.forms.find((item) => item.id === application.formId)
  const version = form?.versions.find((item) => item.id === application?.versionId)

  if (!application || !form || !version) {
    return (
      <ShellPage level="detail" title="Application not found" description="This application no longer exists, or belongs to another organization.">
        <Panel title="Nothing to show" flush={false}>
          <Button variant="secondary" onClick={() => navigate("member-applications")}>Back to applications</Button>
        </Panel>
      </ShellPage>
    )
  }

  const decided = application.status === "Approved" || application.status === "Rejected"
  const canReview = can("members.review_applications")
  const approve = async () => {
    setBusy(true)
    try {
      const approved = await service.approve(organizationId, application, ACTOR)
      notify(`${approved.memberId} created from this application`)
      navigate("member-profile", approved.memberId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <ShellPage
      level="detail"
      title={applicantName(application.values)}
      description={`${application.formName} · version ${application.versionNumber} · submitted ${fmtDate(application.submittedAt)}`}
      meta={
        <>
          <span className="mono">{application.reference}</span>
          <ApplicationStatusBadge status={application.status} />
          <JoinModeBadge mode={form.joinMode} />
          <Badge tone="neutral">{application.source}</Badge>
        </>
      }
      actions={
        <div className="header-actions">
          {application.memberId && <Button variant="secondary" onClick={() => navigate("member-profile", application.memberId)}>View member</Button>}
          {canReview && !decided && (
            <>
              <Button variant="secondary" icon={X} disabled={busy} onClick={() => setRejecting(true)}>Reject</Button>
              <Button icon={CheckCircle2} disabled={busy} onClick={() => void approve()}>{busy ? "Approving…" : "Approve & create member"}</Button>
            </>
          )}
        </div>
      }
    >
      {decided && (
        <Panel title="Decision" flush={false}>
          <KV
            items={[
              ["Status", application.status],
              ["Decided by", application.reviewer ?? "—"],
              ["Decided on", application.decidedAt ? fmtDate(application.decidedAt) : "—"],
              ["Member created", application.memberId ?? "—"],
              ...(application.rejectionReason ? ([["Reason", application.rejectionReason]] as [string, string][]) : []),
            ]}
          />
        </Panel>
      )}

      <Panel title="Applicant" flush={false}>
        <KV
          items={[
            ["Name", applicantName(application.values)],
            ["Phone", applicantPhone(application.values)],
            ["Email", applicantEmail(application.values)],
            ["Submitted through", application.source],
          ]}
        />
      </Panel>

      <ResponseSections version={version} values={application.values} />

      {rejecting && (
        <ActionModal
          title="Reject application"
          submitLabel="Reject application"
          danger
          disabled={!applicationDecisionSchema.safeParse({ reason }).success}
          onClose={() => setRejecting(false)}
          onSubmit={async () => {
            await service.reject(organizationId, application, reason, ACTOR)
            notify(`${application.reference} rejected`)
            setRejecting(false)
          }}
        >
          <TextArea label="Why is this application being rejected?" value={reason} onChange={setReason} placeholder="The applicant will not see this — it is for your records." />
          {reason.trim().length > 0 && !applicationDecisionSchema.safeParse({ reason }).success && (
            <span className="field-error">{applicationDecisionSchema.safeParse({ reason }).error?.issues[0]?.message}</span>
          )}
          <p style={{ color: "var(--muted)", margin: 0 }}>Rejecting creates no member. The application stays on file with its answers.</p>
        </ActionModal>
      )}
    </ShellPage>
  )
}
