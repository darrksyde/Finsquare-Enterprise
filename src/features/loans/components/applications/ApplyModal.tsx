import { useState } from "react"
import { Modal, SelectField } from "@/components/ui"
import { publishedVersion } from "@/features/forms/domain/forms"
import { FormRenderer } from "@/features/forms/components/FormRenderer"
import { GUARANTOR_DOC_FIELDS } from "../../domain/loan-forms"
import type { LoanCtx } from "../LoanUi"

/** In-app application for existing members; loads the published form of the chosen product. */
export function ApplyModal({ ctx, onClose }: { ctx: LoanCtx; onClose: () => void }) {
  const { data, service, notify, navigate } = ctx
  const products = data.products.filter((p) => p.status === "Active" && p.applicationType !== "External" && publishedVersion(data.forms.find((f) => f.productId === p.id)))
  const [name, setName] = useState(products[0]?.name ?? "")
  const product = products.find((p) => p.name === name)
  const form = product && data.forms.find((f) => f.productId === product.id)
  const version = publishedVersion(form)
  return (
    <Modal title="New member application" wide onClose={onClose}>
      <div className="wizard-body">
        {!product || !form || !version ? "No published internal forms available." : (
          <>
            <SelectField label="Loan type" value={name} options={products.map((p) => p.name)} onChange={setName} />
            <div style={{ marginTop: 14 }}>
              <FormRenderer key={product.id} version={version} audience="Internal" members={data.borrowers} loan={product} guarantorDocFields={GUARANTOR_DOC_FIELDS}
                onSubmit={async (values) => { const a = await service.submitFormApplication({ form, version, product, values, members: data.borrowers, source: "Internal" }); notify(`Application ${a.reference} submitted`); onClose(); navigate("loan-application-detail", a.id) }} />
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}
