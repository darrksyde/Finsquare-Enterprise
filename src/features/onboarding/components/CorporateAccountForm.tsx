import { Badge, Field, SelectField } from "@/components/ui"
import { Check, Upload } from "@/icons"
import { BANKS } from "@/features/wallet/constants/banks"
import { ID_TYPES, REQUIRED_CORPORATE_DOCUMENTS, type CorporateAccountDetails } from "../types"
import type { FieldErrors } from "../domain/validation"

interface Props {
  value: CorporateAccountDetails
  onChange: (value: CorporateAccountDetails) => void
  errors?: FieldErrors
}

/** Shared by the onboarding step and Settings → Corporate account & wallet. */
export default function CorporateAccountForm({ value, onChange, errors = {} }: Props) {
  const set = (key: keyof CorporateAccountDetails) => (v: string) => onChange({ ...value, [key]: v })
  const field = (key: keyof CorporateAccountDetails, label: string, placeholder?: string) => (
    <div>
      <Field label={label} value={String(value[key])} placeholder={placeholder} onChange={set(key)} />
      {errors[key] && <small className="field-error">{errors[key]}</small>}
    </div>
  )
  const toggleDoc = (name: string, on: boolean) =>
    onChange({ ...value, documents: on ? [...new Set([...value.documents, name])] : value.documents.filter((d) => d !== name) })
  return (
    <div className="corp-form">
      <section>
        <h4>Business</h4>
        <div className="form-grid">
          {field("businessName", "Corporate / business name")}
          {field("registrationNumber", "Registration number", "e.g. RC-1048223")}
          {field("businessAddress", "Business address")}
          {field("accountHolder", "Account holder name")}
        </div>
      </section>
      <section>
        <h4>Authorized representative</h4>
        <div className="form-grid">
          {field("repName", "Full name")}
          {field("repRole", "Role", "e.g. Treasurer")}
          {field("repPhone", "Phone", "+234")}
          {field("repEmail", "Email")}
          <SelectField label="Identification type" value={value.repIdType} options={ID_TYPES} onChange={set("repIdType")} />
          {field("repIdNumber", "ID number")}
        </div>
      </section>
      <section>
        <h4>Settlement account</h4>
        <div className="form-grid">
          <SelectField label="Bank" value={value.bankName} options={BANKS} onChange={set("bankName")} />
          {field("accountNumber", "Account number", "10 digits")}
          {field("accountName", "Account name")}
        </div>
      </section>
      <section>
        <h4>Verification documents <small>(you can upload these later)</small></h4>
        <div className="corp-docs">
          {REQUIRED_CORPORATE_DOCUMENTS.map((name) => {
            const done = value.documents.includes(name)
            return (
              <label key={name} className={done ? "done" : ""}>
                <span>{done ? <Check size={14} /> : <Upload size={14} />}</span>
                <b>{name}</b>
                {done ? <Badge tone="green">Uploaded</Badge> : <Badge>Pending</Badge>}
                <input
                  type="file"
                  hidden
                  onChange={(e) => {
                    toggleDoc(name, Boolean(e.target.files?.length))
                    e.target.value = ""
                  }}
                />
              </label>
            )
          })}
        </div>
      </section>
    </div>
  )
}
