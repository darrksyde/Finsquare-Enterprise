import { Field, SelectField } from "@/components/ui"
import { NumField, money } from "./LoanUi"
import type { Guarantor } from "../types/loan.types"

export interface GuarantorSlot { gid: string; name: string; phone: string; relationship: string; amount: number }
export const NEW = "＋ New external guarantor"
export const emptySlot = (amount = 0): GuarantorSlot => ({ gid: NEW, name: "", phone: "", relationship: "", amount })

export function slotToGuarantor(s: GuarantorSlot, list: Guarantor[], id: string): Guarantor {
  return s.gid === NEW
    ? { id, name: s.name, phone: s.phone, relationship: s.relationship || "Referee", type: "External", occupation: "—" }
    : list.find((g) => g.id === s.gid)!
}
export const slotValid = (s: GuarantorSlot) => (s.gid === NEW ? s.name.trim() && s.phone.trim() : true) && s.amount > 0

export function GuarantorSlots({ slots, onChange, list }: { slots: GuarantorSlot[]; onChange: (s: GuarantorSlot[]) => void; list: Guarantor[] }) {
  const upd = (i: number, patch: Partial<GuarantorSlot>) => onChange(slots.map((s, j) => (j === i ? { ...s, ...patch } : s)))
  return (
    <div style={{ display: "grid", gap: 12 }}>
      {slots.map((s, i) => (
        <div key={i} className="form-grid" style={{ padding: 12, border: "1px solid var(--line)", borderRadius: 8 }}>
          <SelectField label={`Guarantor ${i + 1}`} value={s.gid === NEW ? NEW : (list.find((g) => g.id === s.gid)?.name ?? NEW)}
            options={[NEW, ...list.map((g) => g.name)]}
            onChange={(n) => upd(i, { gid: n === NEW ? NEW : list.find((g) => g.name === n)!.id })} />
          <NumField label={`Guarantee amount (${money(s.amount)})`} value={s.amount} onChange={(amount) => upd(i, { amount })} />
          {s.gid === NEW && (
            <>
              <Field label="Full name" value={s.name} onChange={(name) => upd(i, { name })} />
              <Field label="Phone" value={s.phone} onChange={(phone) => upd(i, { phone })} />
              <Field label="Relationship" value={s.relationship} onChange={(relationship) => upd(i, { relationship })} />
            </>
          )}
        </div>
      ))}
    </div>
  )
}
