import { useState } from "react"
import { FormRenderer } from "@/features/forms/components/FormRenderer"
import { SEED_ORGANIZATION_ID } from "@/lib/tenancy/seed-tenant"
import { GUARANTOR_DOC_FIELDS } from "../domain/loan-forms"
import { publishedVersion } from "@/features/forms/domain/forms"
import { useLoansFor } from "../hooks/useLoans"

/**
 * The public application link. It carries no session, so the tenant cannot come from the active
 * community: it belongs to the organisation that published the form. Resolving it from the slug is
 * the backend's job, and until then the link addresses the seeded organisation, which is where the
 * published forms live.
 */
export function PublicApplicationPage({ slug }: { slug: string }) {
  const { data, service } = useLoansFor(SEED_ORGANIZATION_ID)
  const [ref, setRef] = useState("")
  const wrap = (c: React.ReactNode) => <div className="page" style={{ maxWidth: 720, margin: "0 auto", padding: 24 }}>{c}</div>
  if (!data) return wrap("Loading…")
  const form = data.forms.find((x) => x.slug === slug && x.status === "Published")
  const product = form && data.products.find((p) => p.id === form.productId && p.status === "Active" && p.applicationType !== "Internal")
  const version = publishedVersion(form)
  if (!form || !product || !version) return wrap(<><h1>Form unavailable</h1><p>This application link is inactive or does not exist.</p></>)
  return wrap(
    <>
      <h1>{form.name}</h1>
      <p style={{ color: "var(--muted)" }}>{product.description} No FinSquare account is needed to apply.</p>
      <FormRenderer version={version} audience="External" members={data.borrowers} loan={product} guarantorDocFields={GUARANTOR_DOC_FIELDS}
        onSubmit={async (values) => { const a = await service.submitFormApplication({ form, version, product, values, members: [], source: "Public link" }); setRef(a.reference) }} />
      {ref && <p>Your reference: <b>{ref}</b></p>}
    </>,
  )
}
