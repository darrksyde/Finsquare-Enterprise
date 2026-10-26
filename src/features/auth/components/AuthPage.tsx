import { useState } from "react"
import { Button, Field } from "@/components/ui"
import Brand, { BrandMark } from "@/components/layout/Brand"
import { validate, type FieldErrors } from "@/lib/validation/zod"
import { ArrowRight } from "@/icons"
import type { CommunityMembership } from "@/features/communities/types"
import { loginSchema } from "../schemas/auth.schema"
import { useAuth } from "../hooks/useAuth"

/**
 * The login gate. Rendered before the shell while there is no session, so it is deliberately not an
 * app page: no sidebar, no breadcrumbs, same first-run look as the onboarding flow.
 *
 * Sign-up is not a second form here — creating the administrator account is what the onboarding flow
 * does, so the switch hands over to it. A staff member who belongs to several institutions first
 * picks which one to enter.
 */
export default function AuthPage({ onSignUp }: { onSignUp: () => void }) {
  const { signIn, pending, error } = useAuth()
  const [credentials, setCredentials] = useState({ email: "", password: "" })
  const [errors, setErrors] = useState<FieldErrors>({})
  const [selecting, setSelecting] = useState(false)
  const [communities, setCommunities] = useState<CommunityMembership[]>([])

  const err = (key: string) => (errors[key] ? <small className="field-error">{errors[key]}</small> : null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const found = validate(loginSchema, credentials)
    setErrors(found)
    if (Object.keys(found).length) return
    const outcome = await signIn({ email: credentials.email.trim(), password: credentials.password })
    if (outcome.needsSelection) {
      setCommunities(outcome.communities)
      setSelecting(true)
    }
  }

  const selectCommunity = async (communityId: string) => {
    const outcome = await signIn({
      email: credentials.email.trim(),
      password: credentials.password,
      communityId,
    })
    if (outcome.needsSelection) {
      setCommunities(outcome.communities)
    }
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

          {selecting ? (
            <div className="onb-community-picker">
              <p className="onb-community-picker-note">
                You belong to more than one institution. Choose which one to continue into.
              </p>
              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
              <div className="onb-community-list">
                {communities.map((community) => (
                  <button
                    type="button"
                    key={community.organizationId}
                    className="onb-community-row"
                    disabled={pending}
                    onClick={() => void selectCommunity(community.organizationId)}
                  >
                    {community.logo ? (
                      <img src={community.logo} alt="" className="onb-community-logo" />
                    ) : (
                      <BrandMark size={32} />
                    )}
                    <span className="onb-community-name">
                      <b>{community.name}</b>
                      <small>{community.roleName}</small>
                    </span>
                    <ArrowRight size={14} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="onb-link"
                disabled={pending}
                onClick={() => {
                  setSelecting(false)
                  setCommunities([])
                }}
              >
                Back
              </button>
            </div>
          ) : (
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
                    placeholder="At least 6 characters"
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
          )}

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
