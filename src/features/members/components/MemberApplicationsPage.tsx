import { useMemo, useState } from "react"
import { ShellPage } from "@/components/layout/ShellPage"
import { Button } from "@/components/ui"
import { ErrorState, LoadingState } from "@/components/feedback/AsyncState"
import { FilterBar, SearchInput } from "@/components/data-display/ManagementPrimitives"
import { PagedTable, Panel, Tabs, downloadCsv, fmtDate } from "@/features/loans/components/LoanUi"
import { ExportButtons } from "@/features/loans/components/LoanUi"
import { printTable } from "@/features/wallet/domain/export"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { useMemberApplications } from "../hooks/useMemberApplications"
import { applicantEmail, applicantName, applicantPhone } from "../domain/member-application.rules"
import { ApplicationStatusBadge } from "./MemberApplicationUi"
import { MEMBER_APPLICATION_STATUSES } from "../types/member-application.types"
import type { MemberApplication, MemberApplicationStatus } from "../types/member-application.types"
import type { View } from "@/types"

const columns = ["Reference", "Applicant", "Phone", "Email", "Form", "Submitted", "Status", "Decided by", "Reason"]

/**
 * Everything people have submitted through the application links. Approving here is what creates a
 * member, so the decisions live on the row and in the detail page rather than in a bulk action.
 */
export function MemberApplicationsPage({ navigate, notify }: { navigate: (view: View, id?: string) => void; notify: (message: string) => void }) {
  const organizationId = useOrganizationId()
  const { data, status, error, retry } = useMemberApplications(organizationId)
  const { can } = useAuthorization()
  const [tab, setTab] = useState<"All" | MemberApplicationStatus>("All")
  const [query, setQuery] = useState("")
  const [formId, setFormId] = useState("All forms")

  const applications = useMemo(() => data?.applications ?? [], [data])
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return applications
      .filter((application) => tab === "All" || application.status === tab)
      .filter((application) => formId === "All forms" || application.formName === formId)
      .filter((application) => !needle || `${applicantName(application.values)} ${applicantPhone(application.values)} ${applicantEmail(application.values)} ${application.reference}`.toLowerCase().includes(needle))
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
  }, [applications, tab, formId, query])

  if (status === "loading" || status === "idle") return <LoadingState label="Loading applications…" />
  if (status === "error" || !data) return <ErrorState message={error ?? "Applications could not be loaded."} retry={retry} />

  const rows = visible.map((application) => [
    application.reference,
    applicantName(application.values),
    applicantPhone(application.values),
    applicantEmail(application.values),
    application.formName,
    fmtDate(application.submittedAt),
    application.status,
    application.reviewer ?? "—",
    application.rejectionReason ?? "—",
  ])

  return (
    <ShellPage
      title="Applications"
      description="Review what came in through the application links and turn approved applicants into members."
      actions={can("members.manage_forms") && <Button variant="secondary" onClick={() => navigate("member-application-forms")}>Application forms</Button>}
    >
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "All" as const, label: "All", count: applications.length },
          ...MEMBER_APPLICATION_STATUSES.map((id) => ({ id, label: id, count: applications.filter((application) => application.status === id).length })),
        ]}
      />
      <Panel>
        <FilterBar>
          <SearchInput value={query} onChange={setQuery} placeholder="Search applicant, phone or reference" />
          <div className="management-filters">
            <select value={formId} onChange={(event) => setFormId(event.target.value)}>
              <option>All forms</option>
              {data.forms.map((form) => <option key={form.id}>{form.name}</option>)}
            </select>
            <ExportButtons
              disabled={!rows.length}
              onCsv={() => { downloadCsv("member-applications", columns, rows); notify("CSV exported") }}
              onPdf={() => printTable("Member applications", columns, rows)}
            />
          </div>
        </FilterBar>
        <PagedTable
          rows={visible}
          rowKey={(application) => application.id}
          onRowClick={(application) => navigate("member-application-detail", application.id)}
          emptyText="No applications match these filters."
          columns={[
            {
              id: "applicant",
              header: "Applicant",
              render: (application: MemberApplication) => (
                <>
                  <b>{applicantName(application.values)}</b>
                  <div style={{ color: "var(--muted)" }}>{application.reference} · {application.source}</div>
                </>
              ),
            },
            { id: "phone", header: "Phone", render: (application) => applicantPhone(application.values) },
            { id: "form", header: "Form", render: (application) => application.formName },
            { id: "submitted", header: "Submitted", render: (application) => fmtDate(application.submittedAt) },
            { id: "status", header: "Status", render: (application) => <ApplicationStatusBadge status={application.status} /> },
            { id: "by", header: "Decided by", render: (application) => application.reviewer ?? "—" },
            {
              id: "member",
              header: "Member",
              render: (application) => application.memberId
                ? <span className="mono">{application.memberId}</span>
                : <span style={{ color: "var(--blue-text)" }}>Open</span>,
            },
          ]}
        />
      </Panel>
      <p className="contribution-hint">
        {applications.filter((application) => application.status === "Submitted" || application.status === "Under Review").length} waiting for a decision · {applications.filter((application) => application.status === "Approved").length} approved · {applications.filter((application) => application.status === "Rejected").length} rejected
      </p>
    </ShellPage>
  )
}
