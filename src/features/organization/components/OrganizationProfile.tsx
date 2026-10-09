import { useState } from "react"
import { Badge, Button, Field, SectionHeader, SelectField } from "@/components/ui"
import { Pencil } from "@/icons"
import OrgAvatar from "@/components/layout/OrgAvatar"
import { ORGANIZATION_TYPES, type OrganizationProfile } from "@/app/providers/WorkspaceProvider"

const fields: { key: keyof Omit<OrganizationProfile, "logo">; label: string }[] = [
  { key: "name", label: "Organization name" },
  { key: "type", label: "Type" },
  { key: "legalName", label: "Registered name" },
  { key: "registrationNumber", label: "Registration number" },
  { key: "yearEstablished", label: "Year established" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "website", label: "Website" },
  { key: "address", label: "Address" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "memberCount", label: "Number of members" },
  { key: "areaOfOperation", label: "Area of operation" },
  { key: "description", label: "Description" },
  { key: "state", label: "State" },
]

export default function OrganizationProfilePage({
  profile, save, notify, environment, canEdit, restartOnboarding,
}: {
  profile: OrganizationProfile
  save: (value: Partial<OrganizationProfile>) => void
  notify: (text: string) => void
  environment: string
  canEdit: boolean
  restartOnboarding: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(profile)
  const nameOk = draft.name.trim().length > 1
  const emailOk = !draft.email || /^\S+@\S+\.\S+$/.test(draft.email)

  return (
    <div className="page">
      <SectionHeader
        eyebrow="SETTINGS"
        title="Organization details"
        description="Your organization's profile as it appears to members and administrators."
        actions={canEdit && !editing && <Button icon={Pencil} onClick={() => { setDraft(profile); setEditing(true) }}>Edit details</Button>}
      />
      <section className="panel">
        <div className="panel-head">
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <OrgAvatar large />
            <div>
              <b>{profile.name}</b>
              <span>{profile.type}</span>
            </div>
          </div>
          <Badge tone={environment === "live" ? "green" : "amber"}>{environment.replace("_", " ").toUpperCase()}</Badge>
        </div>
        {editing ? (
          <form
            className="org-details"
            onSubmit={(e) => {
              e.preventDefault()
              if (!nameOk || !emailOk) return
              save({ ...draft, name: draft.name.trim() })
              setEditing(false)
              notify("Organization details saved")
            }}
          >
            {fields.map(({ key, label }) =>
              key === "type" ? (
                <SelectField key={key} label={label} value={draft.type} options={ORGANIZATION_TYPES} onChange={(v) => setDraft({ ...draft, type: v })} />
              ) : (
                <Field key={key} label={label} value={draft[key]} onChange={(v) => setDraft({ ...draft, [key]: v })} />
              ),
            )}
            <div style={{ gridColumn: "1 / -1", display: "flex", gap: 8, alignItems: "center" }}>
              <Button type="submit" disabled={!nameOk || !emailOk}>Save changes</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              {!nameOk && <small>Name is required.</small>}
              {!emailOk && <small>Enter a valid email address.</small>}
            </div>
          </form>
        ) : (
          <dl className="org-details">
            {fields.map(({ key, label }) => (
              <div key={key}>
                <dt>{label}</dt>
                <dd>{profile[key] || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
      <p className="muted" style={{ marginTop: 12 }}>
        Logo and theme are managed under Settings, General.{" "}
        {canEdit && <button type="button" className="link-btn" onClick={restartOnboarding}>Restart onboarding</button>}
      </p>
    </div>
  )
}
