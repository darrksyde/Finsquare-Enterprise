import { useState } from "react"
import { FormRenderer } from "@/features/forms/components/FormRenderer"
import { publishedVersion } from "@/features/forms/domain/forms"
import { LoadingState } from "@/components/feedback/AsyncState"
import { SEED_ORGANIZATION_ID } from "@/lib/tenancy/seed-tenant"
import { useMemberApplications } from "../hooks/useMemberApplications"
import { applicationLinkLive } from "../domain/member-application.rules"

/**
 * The link anyone can open — no FinSquare account needed. It answers only while the form is
 * published and the administrator has left the link switched on.
 *
 * The link carries no session, so the tenant cannot come from the active community: it belongs to the
 * organisation that published the form. Resolving it from the slug is the backend's job, and until
 * then the link addresses the seeded organisation, which is where the published forms live.
 */
const PUBLIC_LINK_ORG_ID = SEED_ORGANIZATION_ID

export function PublicMemberApplicationPage({ slug }: { slug: string }) {
  const { data, service } = useMemberApplications(PUBLIC_LINK_ORG_ID)
  const [reference, setReference] = useState("")
  const [joined, setJoined] = useState(false)

  const wrap = (content: React.ReactNode) => (
    <div className="page" style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>{content}</div>
  )

  if (!data) return wrap(<LoadingState label="Loading application form…" />)

  const form = data.forms.find((item) => item.slug === slug)
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
          const application = await service.submit(PUBLIC_LINK_ORG_ID, { form, version, values, source: "Public link" })
          setJoined(application.status === "Approved")
          setReference(application.reference)
        }}
      />
    </>,
  )
}
