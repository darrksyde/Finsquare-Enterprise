import { useState } from "react"
import { Plus } from "@/icons"
import { Button, SectionHeader } from "@/components/ui"
import { calculateLoan } from "../domain/calculations"
import { mockId } from "../mocks/loans.mock"
import { DisbursementModal } from "../components/DisbursementModal"
import { GuarantorVerifyModal } from "../components/GuarantorVerifyModal"
import { GuarantorSlots, emptySlot, slotToGuarantor, slotValid } from "../components/GuarantorSlots"
import { ResponseSections } from "@/features/forms/components/ResponseSections"
import { GUARANTOR_DOC_FIELDS } from "../domain/loan-forms"
import { LoanSummaryPanel } from "../components/LoanSummaryPanel"
import { ActionModal, KV, LoanPage, NumField, Panel, PagedTable, StatusBadge, Tabs, TextArea, fmtDate, money, type LoanCtx, type LoanPageProps } from "../components/LoanUi"
import type { GuarantorRequest, LoanApplication } from "../types/loan.types"

type DetailTab = "overview" | "responses" | "eligibility" | "guarantors" | "documents" | "activity"

type Dlg = null | "approve" | "reject" | "info" | "revise" | "disburse" | "addg" | { verify: GuarantorRequest }

function Detail({ app, ctx }: { app: LoanApplication; ctx: LoanCtx }) {
  const { data, service, can, notify, navigate } = ctx
  const [dlg, setDlg] = useState<Dlg>(null)
  const [tab, setTab] = useState<DetailTab>("overview")
  const [amount, setAmount] = useState(app.approvedAmount ?? app.terms.amount)
  const [duration, setDuration] = useState(app.terms.duration)
  const [text, setText] = useState("")
  const [slot, setSlot] = useState(emptySlot(app.terms.amount))
  const guarantors = data.guarantorRequests.filter((g) => g.applicationId === app.id)
  const product = data.products.find((p) => p.id === app.productId)
  const summary = calculateLoan({ ...app.terms, amount: app.approvedAmount ?? app.terms.amount })
  const open = ["Submitted", "Under Review", "Guarantor Pending", "Draft"].includes(app.status)
  const needG = (product?.requiresGuarantor ? product.guarantorsRequired : 0)
  const accepted = guarantors.filter((g) => g.status === "Accepted").length
  const a = app.applicant
  const close = () => { setDlg(null); setText("") }
  const loan = data.loans.find((l) => l.applicationId === app.id)
  const flowOk = accepted >= needG
  const response = data.responses.find((r) => r.applicationId === app.id)
  const respVersion = data.forms.find((f) => f.id === response?.formId)?.versions.find((v) => v.id === response?.versionId)

  return (
    <>
      <SectionHeader eyebrow={`APPLICATION ${app.reference}`} title={a.name} description={`${app.productName} · ${money(app.terms.amount)} · submitted ${fmtDate(app.submittedAt)} via ${app.source}`}
        actions={
          <>
            <StatusBadge status={app.status} />
            {app.status === "Submitted" && can("loans.update") && <Button variant="secondary" onClick={async () => { await service.startReview(app.id); notify("Review started") }}>Start review</Button>}
            {loan && <Button variant="secondary" onClick={() => navigate("loan-detail", loan.id)}>View loan</Button>}
          </>
        } />

      {app.status === "Offer Sent" && app.revisedOffer && (
        <div className="blocked-note"><span><b>Revised offer awaiting applicant acceptance:</b> {money(app.revisedOffer.amount)} over {app.revisedOffer.duration} {app.terms.durationUnit.toLowerCase()} (requested {money(app.terms.amount)}). {app.revisedOffer.note}</span>
          {can("loans.approve") && <Button variant="secondary" onClick={async () => { await service.acceptOffer(app.id); notify("Applicant acceptance recorded") }}>Record acceptance</Button>}</div>
      )}
      {app.status === "Rejected" && <div className="blocked-note" style={{ background: "var(--red-soft)" }}><span><b>Rejected:</b> {app.rejectionReason}</span></div>}
      {app.infoRequest && open && <div className="blocked-note"><span><b>Information requested:</b> {app.infoRequest}</span></div>}

      <div className="dashboard-grid" style={{ marginTop: 0, gridTemplateColumns: "1.2fr .8fr" }}>
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <Tabs value={tab} onChange={setTab} tabs={[
            { id: "overview", label: "Overview" },
            { id: "responses", label: "Form responses" },
            { id: "eligibility", label: "Eligibility" },
            { id: "guarantors", label: "Guarantors", count: guarantors.length },
            { id: "documents", label: "Documents", count: app.documents.length },
            { id: "activity", label: "Activity", count: app.activity.length },
          ]} />
          {tab === "overview" && (<>
          <Panel title="Applicant" actions={<StatusBadge status={a.type === "Member" ? "Active" : "Pending"} />}>
            <KV cols={3} items={[["Name", a.name], ["Phone", a.phone], ["Email", a.email ?? "—"], ["Member / customer ID", a.memberId ?? "External applicant (no FinSquare account)"], ["Branch", a.branch], ["Occupation", app.employment], ["Address", a.address], ["Membership", a.type === "Member" ? `${a.membershipMonths} months` : "—"], ["Savings", money(a.savingsBalance)], ["Monthly income", app.monthlyIncome ? money(app.monthlyIncome) : "—"], ["Identity (KYC)", a.kycVerified ? "Verified" : "Not verified"]]} />
          </Panel>
          <Panel title="Loan request">
            <KV cols={3} items={[["Product", app.productName], ["Amount", money(app.terms.amount)], ["Purpose", app.purpose], ["Duration", `${app.terms.duration} ${app.terms.durationUnit.toLowerCase()}`], ["Interest", app.terms.interestType === "Zero interest" ? "Zero interest" : `${app.terms.interestRate}% ${app.terms.interestType.toLowerCase()}`], ["Fees", `${app.terms.applicationFeePct}% (${money(summary.fees)})`], ["Repayment plan", `${summary.count} × ${money(summary.installment)} ${app.terms.frequency.toLowerCase()}`], ["Total repayable", money(summary.totalRepayable)], ["Officer", app.officer]]} />
          </Panel>
          </>)}
          {tab === "responses" && (response && respVersion ? (<>
            <div style={{ color: "var(--muted)" }}>{response.applicantType} applicant · submitted on form version {response.versionNumber}</div>
            <ResponseSections version={respVersion} values={response.values} guarantorDocFields={GUARANTOR_DOC_FIELDS} docStatus={(f) => app.documents.find((d) => d.name.toLowerCase() === f.label.toLowerCase())?.review ?? "Pending review"} onFile={notify} />
          </>) : (
            <div className="tab-empty"><b>No form responses on file</b><span>This application was captured without an application form. Applicant and loan details are on the Overview tab.</span></div>
          ))}
          {tab === "eligibility" && (<>
          <Panel title="Eligibility" subtitle="Evaluated against the product rules at submission" actions={<StatusBadge status={app.eligibility.outcome} />}>
            <PagedTable rows={app.eligibility.checks} rowKey={(c) => c.rule}
              columns={[{ id: "r", header: "Rule", render: (c) => c.rule }, { id: "e", header: "Required", render: (c) => c.expected }, { id: "a", header: "Actual", render: (c) => c.actual }, { id: "s", header: "Result", render: (c) => <StatusBadge status={c.result === "pass" ? "Eligible" : c.result === "fail" ? "Not Eligible" : "Needs Review"} /> }]} />
          </Panel>
          </>)}
          {tab === "guarantors" && (<>
          <Panel title="Guarantors" subtitle={needG ? `${accepted} of ${needG} required guarantors accepted` : "Not required for this product"}
            actions={can("guarantors.manage") && open && <Button variant="secondary" icon={Plus} onClick={() => setDlg("addg")}>Add guarantor</Button>}>
            <PagedTable rows={guarantors} rowKey={(g) => g.id} onRowClick={(g) => setDlg({ verify: g })} emptyText="No guarantors on this application"
              columns={[{ id: "n", header: "Name", render: (g) => <b>{g.guarantor.name}</b> }, { id: "c", header: "Contact", render: (g) => g.guarantor.phone }, { id: "r", header: "Relationship", render: (g) => g.guarantor.relationship },
                { id: "t", header: "Type", render: (g) => g.guarantor.type }, { id: "m", header: "Amount", render: (g) => money(g.amount) }, { id: "d", header: "Signed form", render: (g) => (g.documents.length ? "Uploaded" : "—") }, { id: "s", header: "Status", render: (g) => <StatusBadge status={g.status} /> }]} />
          </Panel>
          </>)}
          {tab === "documents" && (<>
          <Panel title="Documents">
            <PagedTable rows={app.documents} rowKey={(d) => d.id} emptyText="No documents uploaded"
              columns={[{ id: "n", header: "Document", render: (d) => d.name }, { id: "t", header: "Type", render: (d) => d.type }, { id: "u", header: "Uploaded", render: (d) => fmtDate(d.uploadedAt) }, { id: "s", header: "Review", render: (d) => <StatusBadge status={d.review} /> },
                { id: "x", header: "", render: (d) => can("loans.update") && d.review === "Pending review" ? (
                  <span style={{ display: "flex", gap: 6 }}><Button variant="ghost" onClick={() => void service.reviewDocument(app.id, d.id, "Accepted")}>Accept</Button><Button variant="ghost" onClick={() => void service.reviewDocument(app.id, d.id, "Rejected")}>Reject</Button></span>) : null }]} />
          </Panel>
          </>)}
          {tab === "activity" && (<>
          <Panel title="Activity">
            {[...app.activity].reverse().map((e) => (
              <div className="ready-row" key={e.id} style={{ height: "auto", padding: "9px 14px", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}><b>{e.action}</b>{e.detail && <div style={{ color: "var(--muted)" }}>{e.detail}</div>}<div style={{ color: "var(--faint)" }}>{e.actor} · {fmtDate(e.at)}</div></div>
              </div>
            ))}
          </Panel>
          </>)}
        </div>
        <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
          <Panel title="Decision" flush={false}>
            {open ? (
              <div style={{ display: "grid", gap: 8 }}>
                {!flowOk && <div style={{ color: "var(--amber-text)", fontSize: 12 }}>Approval needs {needG} accepted guarantor(s).</div>}
                {app.eligibility.outcome === "Not Eligible" && <div style={{ color: "var(--red-text)", fontSize: 12 }}>Applicant is not eligible — approving overrides the product rules.</div>}
                {can("loans.approve") && <Button disabled={!flowOk} onClick={() => setDlg("approve")}>Approve</Button>}
                {can("loans.update") && <Button variant="secondary" onClick={() => setDlg("revise")}>Modify / revise offer</Button>}
                {can("loans.update") && <Button variant="secondary" onClick={() => setDlg("info")}>Request information</Button>}
                {can("loans.reject") && <Button variant="danger" onClick={() => setDlg("reject")}>Reject</Button>}
              </div>
            ) : ["Approved", "Offer Accepted"].includes(app.status) ? (
              <div style={{ display: "grid", gap: 8 }}>
                <div>Approved for <b>{money(app.approvedAmount ?? app.terms.amount)}</b>. Ready for disbursement.</div>
                {can("loans.disburse") ? <Button onClick={() => setDlg("disburse")}>Disburse</Button> : <span style={{ color: "var(--muted)" }}>You cannot disburse loans.</span>}
              </div>
            ) : <div style={{ color: "var(--muted)" }}>No decision actions available for status “{app.status}”.</div>}
            {app.status === "Offer Sent" && <div style={{ marginTop: 8, color: "var(--muted)", fontSize: 12 }}>Waiting for applicant to accept the revised offer before disbursement.</div>}
          </Panel>
          <LoanSummaryPanel summary={summary} showSchedule={false} />
        </div>
      </div>

      {dlg === "approve" && (
        <ActionModal title="Approve application" onClose={close} submitLabel={amount !== app.terms.amount ? "Send revised offer" : "Approve"}
          onSubmit={async () => { await service.approve(app.id, amount, text); notify(amount !== app.terms.amount ? "Revised offer sent — awaiting acceptance" : "Application approved") }}>
          <div className="form-grid"><NumField label="Approved amount (₦)" value={amount} onChange={setAmount} /><TextArea label="Note" value={text} onChange={setText} /></div>
          {amount !== app.terms.amount && <div className="blocked-note"><span>Amount differs from the {money(app.terms.amount)} requested. A revised offer is sent and the applicant must accept it.</span></div>}
        </ActionModal>
      )}
      {dlg === "revise" && (
        <ActionModal title="Revise offer" onClose={close} submitLabel="Send revised offer" disabled={!amount || !duration}
          onSubmit={async () => { await service.reviseOffer(app.id, amount, duration, text); notify("Revised offer sent") }}>
          <div className="form-grid"><NumField label="Offered amount (₦)" value={amount} onChange={setAmount} /><NumField label={`Duration (${app.terms.durationUnit.toLowerCase()})`} value={duration} onChange={setDuration} /><TextArea label="Reason for revision" value={text} onChange={setText} /></div>
        </ActionModal>
      )}
      {dlg === "reject" && (
        <ActionModal danger title="Reject application" onClose={close} submitLabel="Reject" disabled={text.trim().length < 5} onSubmit={async () => { await service.reject(app.id, text); notify("Application rejected") }}>
          <div className="form-grid"><TextArea label="Rejection reason (required)" value={text} onChange={setText} /></div>
        </ActionModal>
      )}
      {dlg === "info" && (
        <ActionModal title="Request information" onClose={close} submitLabel="Send request" disabled={!text.trim()} onSubmit={async () => { await service.requestInfo(app.id, text); notify("Request sent to applicant") }}>
          <div className="form-grid"><TextArea label="What do you need from the applicant?" value={text} onChange={setText} /></div>
        </ActionModal>
      )}
      {dlg === "addg" && (
        <ActionModal title="Add guarantor" onClose={close} submitLabel="Add" disabled={!slotValid(slot)}
          onSubmit={async () => { await service.addGuarantor(app.id, slotToGuarantor(slot, data.guarantors, mockId("g")), slot.amount); notify("Guarantor request created") }}>
          <GuarantorSlots slots={[slot]} list={data.guarantors} onChange={([s]) => setSlot(s)} />
        </ActionModal>
      )}
      {dlg === "disburse" && <DisbursementModal apps={[app]} ctx={ctx} onClose={close} onDone={([id]) => id && navigate("loan-detail", id)} />}
      {dlg && typeof dlg === "object" && <GuarantorVerifyModal req={dlg.verify} ctx={ctx} onClose={close} />}
    </>
  )
}

export function LoanApplicationDetailPage(props: LoanPageProps) {
  return (
    <LoanPage {...props}>
      {(ctx) => {
        const app = ctx.data.applications.find((a) => a.id === props.id)
        return app ? <Detail app={app} ctx={ctx} /> : <div className="tab-empty"><b>Application not found</b></div>
      }}
    </LoanPage>
  )
}
