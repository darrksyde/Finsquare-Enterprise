import { useState } from "react"
import { Button, Field } from "@/components/ui"
import Brand, { BrandMark } from "@/components/layout/Brand"
import { validate, type FieldErrors } from "@/lib/validation/zod"
import { ArrowRight } from "@/icons"
import { loginSchema } from "../schemas/auth.schema"
import { useAuth } from "../hooks/useAuth"

/**
 * The login gate. Rendered before the shell while there is no session, so it is deliberately not an
 * app page: no sidebar, no breadcrumbs, same first-run look as the onboarding flow.
 *
 * Sign-up is not a second form here — creating the administrator account is what the onboarding flow
 * does, so the switch hands over to it.
 */
export default function AuthPage({ onSignUp }: { onSignUp: () => void }) {
  const { signIn, pending, error } = useAuth()
  const [credentials, setCredentials] = useState({ email: "", password: "" })
  const [errors, setErrors] = useState<FieldErrors>({})

  const err = (key: string) => (errors[key] ? <small className="field-error">{errors[key]}</small> : null)

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const found = validate(loginSchema, credentials)
    setErrors(found)
    if (Object.keys(found).length) return
    void signIn({ email: credentials.email.trim(), password: credentials.password })
  }

  return (
    <div className="onb">
      <header className="onb-top">
        <Brand />
        <span className="onb-top-note">Sign in to your workspace</span>
      </header>

      <main className="onb-main">
        <div className="onb-card">
          <div className="onb-card-head">
            <span className="onb-step-label">Administrator access</span>
          </div>
          <div className="onb-welcome">
            <BrandMark size={46} />
            <div>
              <h1>Log in to FinSquare</h1>
              <p>Use the administrator account for your organization.</p>
            </div>
          </div>

          <form onSubmit={submit} noValidate>
            <div className="form-grid">
              <div>
                <Field
                  label="Work email"
                  type="email"
                  value={credentials.email}
                  placeholder="you@organization.com"
                  onChange={(value) => setCredentials({ ...credentials, email: value })}
                />
                {err("email")}
              </div>
              <div>
                <Field
                  label="Password"
                  type="password"
                  value={credentials.password}
                  placeholder="At least 8 characters"
                  onChange={(value) => setCredentials({ ...credentials, password: value })}
                />
                {err("password")}
              </div>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <div className="onb-actions">
              <span className="onb-top-note" />
              <Button type="submit" disabled={pending}>
                {pending ? "Signing in…" : "Log in"} <ArrowRight size={14} />
              </Button>
            </div>
          </form>

          <p className="onb-auth-switch">
            New here?{" "}
            <button type="button" className="onb-link" onClick={onSignUp}>
              Create an account
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
