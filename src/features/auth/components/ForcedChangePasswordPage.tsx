import { useState } from "react"
import { Button, Field } from "@/components/ui"
import Brand, { BrandMark } from "@/components/layout/Brand"
import { validate, type FieldErrors } from "@/lib/validation/zod"
import { ArrowRight } from "@/icons"
import { changePasswordSchema } from "../schemas/auth.schema"
import { useAuth } from "../hooks/useAuth"

/**
 * The forced password gate, shown after sign-in while `session.mustChangePassword` is set. Like the
 * login gate it renders outside the shell — no sidebar, no breadcrumbs.
 */
export default function ForcedChangePasswordPage() {
  const { changePassword, changingPassword, changePasswordError } = useAuth()
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [errors, setErrors] = useState<FieldErrors>({})

  const err = (key: string) => (errors[key] ? <small className="field-error">{errors[key]}</small> : null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found = validate(changePasswordSchema, form)
    setErrors(found)
    if (Object.keys(found).length) return
    await changePassword(form.currentPassword, form.newPassword)
  }

  return (
    <div className="onb">
      <header className="onb-top">
        <Brand />
        <span className="onb-top-note">Set a new password</span>
      </header>

      <main className="onb-main">
        <div className="onb-card">
          <div className="onb-card-head">
            <span className="onb-step-label">Administrator access</span>
          </div>
          <div className="onb-welcome">
            <BrandMark size={46} />
            <div>
              <h1>Set a new password</h1>
              <p>You are using a temporary password and must choose a new one before continuing.</p>
            </div>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="onb-fields">
              <div>
                <Field
                  label="Current password"
                  type="password"
                  value={form.currentPassword}
                  placeholder="Your temporary password"
                  onChange={(value) => setForm({ ...form, currentPassword: value })}
                />
                {err("currentPassword")}
              </div>
              <div>
                <Field
                  label="New password"
                  type="password"
                  value={form.newPassword}
                  placeholder="8+ chars, upper, lower, number, symbol"
                  onChange={(value) => setForm({ ...form, newPassword: value })}
                />
                {err("newPassword")}
              </div>
              <div>
                <Field
                  label="Confirm new password"
                  type="password"
                  value={form.confirmPassword}
                  placeholder="Re-enter your new password"
                  onChange={(value) => setForm({ ...form, confirmPassword: value })}
                />
                {err("confirmPassword")}
              </div>
            </div>
            {changePasswordError && (
              <p className="form-error" role="alert">
                {changePasswordError}
              </p>
            )}
            <div className="onb-actions">
              <span className="onb-top-note" />
              <Button type="submit" disabled={changingPassword}>
                {changingPassword ? "Saving…" : "Save new password"} <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
