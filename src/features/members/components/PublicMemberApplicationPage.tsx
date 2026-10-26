import { useEffect, useState } from "react"
import { FormRenderer } from "@/features/forms/components/FormRenderer"
import { publishedVersion } from "@/features/forms/domain/forms"
import { LoadingState } from "@/components/feedback/AsyncState"
import { memberApplicationsService } from "../services/member-applications.service"
import { applicationLinkLive } from "../domain/member-application.rules"
import type { MemberApplicationForm } from "../types/member-application.types"

/**
 * The link anyone can open — no FinSquare account needed. It answers only while the form is
 * published and the administrator has left the link switched on.
 *
 * The link carries no session, so the tenant cannot come from the active community: the backend
 * resolves the form from its slug through the public endpoint.
 */
export function PublicMemberApplicationPage({ slug }: { slug: string }) {
  const [form, setForm] = useState<MemberApplicationForm | null>(null)
  const [loading, setLoading] = useState(true)
  const [reference, setReference] = useState("")
  const [joined, setJoined] = useState(false)

  useEffect(() => {
    let active = true
    memberApplicationsService
      .getPublicForm(slug)
      .then((result) => {
        if (!active) return
        setForm(result)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setForm(null)
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [slug])

  const wrap = (content: React.ReactNode) => (
    <div className="page" style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>{content}</div>
  )

  if (loading) return wrap(<LoadingState label="Loading application form…" />)

  if (!form || !applicationLinkLive(form)) {
    return wrap(
      <>
        <h1>Application link closed</h1>
        <p style={{ color: "var(--muted)" }}>
          {form
            ? "This organization is not accepting applications through this link at the moment. Please contact them directly."
            : "This application link is not valid. Check that you copied the whole link."}
        </p>
      </>,
    )
  }

  const version = publishedVersion(form)!
  if (reference) {
    return wrap(
      <>
        <h1>Application received</h1>
        <p style={{ color: "var(--muted)" }}>
          Your reference is <b className="mono">{reference}</b>. Keep it for your records.
        </p>
        <p style={{ color: "var(--muted)" }}>
          {joined
            ? "You are now a member. The organization will be in touch about your account."
            : "An administrator will review your application and contact you if anything else is needed."}
        </p>
      </>,
    )
  }

  return wrap(
    <>
      <h1>{form.name}</h1>
      <p style={{ color: "var(--muted)" }}>
        {form.joinMode === "Open"
          ? "Fill this in and you become a member straight away. No FinSquare account is needed."
          : "Fill this in and an administrator will review your application. No FinSquare account is needed."}
      </p>
      <FormRenderer
        version={version}
        audience="External"
        submittedBody={
          form.joinMode === "Open"
            ? "Thank you. You are now a member and the organization will be in touch about your account."
            : "Thank you. An administrator will review your application and contact you."
        }
        onSubmit={async (values) => {
          const application = await memberApplicationsService.submitPublic(slug, values)
          setJoined(application.status === "Approved")
          setReference(application.reference)
        }}
      />
    </>,
  )
}
