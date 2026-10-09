import { useEffect, useState } from "react"
import AccentPicker from "./AccentPicker"
import OrgAvatar from "@/components/layout/OrgAvatar"
import type { ThemePreference } from "@/app/providers/WorkspaceProvider"
import {
  Activity,
  Blocks,
  Check,
  CheckCircle2,
  CreditCard,
  Folder,
  GitBranch,
  Network,
  Plus,
  ReceiptText,
  Settings,
  ShieldCheck,
  WalletCards,
} from "@/icons"
import { Button, Badge, Progress, SectionHeader } from "@/components/ui"
import type { View } from "@/types"
import type { IconType } from "@/icons"

export function GenericPage({
  view,
  live,
  notify,
}: {
  view: View
  live: boolean
  notify: (s: string) => void
}) {
  const config: Record<string, [string, string, IconType]> = {
    payments: [
      "Payments",
      "Track and reconcile member payments across all enabled products.",
      CreditCard,
    ],
    savings: [
      "Savings",
      "Create member savings products and monitor target progress.",
      WalletCards,
    ],
    repayments: [
      "Repayments",
      "Track loan repayment schedules and recorded collections.",
      ReceiptText,
    ],
    guarantors: [
      "Guarantors",
      "Manage guarantor requests and approval activity.",
      ShieldCheck,
    ],
    documents: [
      "Documents",
      "Store and organize important files for your organization.",
      Folder,
    ],
    reports: [
      "Reports",
      "Understand member, financial and operational activity.",
      Activity,
    ],
    settings: [
      "Workspace settings",
      "Configure organization details, modules and operational preferences.",
      Settings,
    ],
    groups: [
      "Groups",
      "Organize members into working groups and flexible segments.",
      Network,
    ],
    branches: [
      "Branches",
      "Manage geographic branches and their local administrators.",
      GitBranch,
    ],
  }
  const [title, description, Icon] = config[view] || [
    "Workspace",
    "Manage your organization.",
    Blocks,
  ]
  return (
    <div className="page">
      <SectionHeader
        eyebrow="LAGOS FARMERS COOPERATIVE"
        title={title}
        description={description}
        actions={
          <Button
            icon={Plus}
            disabled={!live && view === "payments"}
            onClick={() => notify(`${title} action opened`)}
          >
            New {title.toLowerCase().replace(/s$/, "")}
          </Button>
        }
      />
      <div className="generic-grid">
        <section className="panel generic-main">
          <div className="generic-icon">
            <Icon size={24} />
          </div>
          <b>{title} workspace</b>
          <p>
            This module is enabled and ready to configure. Use the module settings
            to explore the complete product story.
          </p>
          <Button
            variant="secondary"
            onClick={() => notify(`${title} configuration opened`)}
          >
            Open configuration
          </Button>
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <b>Module status</b>
              <span>Configuration overview</span>
            </div>
          </div>
          <div className="settings-list">
            <div>
              <span>Module</span>
              <Badge tone="green">Enabled</Badge>
            </div>
            <div>
              <span>Sample data</span>
              <b>Available</b>
            </div>
            <div>
              <span>Financial operations</span>
              <Badge tone={live ? "green" : "blue"}>
                {live ? "Live" : "Test mode"}
              </Badge>
            </div>
            <div>
              <span>Last updated</span>
              <b>Today, 10:42</b>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}


export function SettingsPage({
  theme,
  setTheme,
  accent,
  setAccent,
  notify,
  organization,
  setLogo,
}: {
  organization: { name: string; logo: string }
  setLogo: (value: string) => void
  theme: ThemePreference
  setTheme: (value: ThemePreference) => void
  accent: string
  setAccent: (value: string) => void
  notify: (text: string) => void
}) {
  return (
    <div className="page">
      <SectionHeader
        eyebrow="WORKSPACE SETTINGS"
        title="Appearance & branding"
        description="Choose a comfortable interface theme and align the workspace with your organization’s brand."
      />
      <div className="appearance-layout">
        <section className="panel appearance-panel">
          <div className="panel-head">
            <div>
              <b>Interface theme</b>
              <span>Applied immediately across the entire workspace</span>
            </div>
          </div>
          <div className="theme-options">
            {([
              ["light", "Light", "Bright neutral surfaces", "light-preview"],
              ["dark", "Dark", "Reduced-glare dark surfaces", "dark-preview"],
              ["system", "System", "Match your device setting", "light-preview system-preview"],
            ] as const).map(([id, label, hint, preview]) => (
              <button
                type="button"
                key={id}
                className={theme === id ? "active" : ""}
                aria-pressed={theme === id}
                onClick={() => setTheme(id)}
              >
                <span className={`theme-preview ${preview}`}>
                  <i />
                  <i />
                  <i />
                </span>
                <span>
                  <b>{label}</b>
                  <small>{hint}</small>
                </span>
                {theme === id && <CheckCircle2 size={18} />}
              </button>
            ))}
          </div>
        </section>

        <section className="panel appearance-panel">
          <div className="panel-head">
            <div>
              <b>Organization logo</b>
              <span>Shown in the sidebar and on member-facing pages. PNG, JPG or SVG, up to 512 KB.</span>
            </div>
          </div>
          <div className="logo-upload" style={{ padding: 16 }}>
            <OrgAvatar large />
            <label className="btn btn-secondary" style={{ cursor: "pointer" }}>
              {organization.logo ? "Replace logo" : "Upload logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ""
                  if (!file) return
                  if (file.size > 512 * 1024) return notify("Logo must be 512 KB or smaller")
                  const reader = new FileReader()
                  reader.onload = () => {
                    setLogo(String(reader.result))
                    notify("Logo updated")
                  }
                  reader.readAsDataURL(file)
                }}
              />
            </label>
            {organization.logo && (
              <Button variant="ghost" onClick={() => { setLogo(""); notify("Logo removed") }}>Remove</Button>
            )}
          </div>
        </section>

        <section className="panel appearance-panel">
          <div className="panel-head">
            <div>
              <b>Primary brand color</b>
              <span>
                Used for actions, progress, focus states and selected navigation
              </span>
            </div>
          </div>
          <AccentPicker accent={accent} setAccent={setAccent} onPreset={(label) => notify(`${label} applied as the primary color`)} />
        </section>

        <section className="panel brand-preview-panel">
          <div className="panel-head">
            <div>
              <b>Brand preview</b>
              <span>See how your choices appear in key workspace controls</span>
            </div>
          </div>
          <div className="brand-preview-content">
            <div className="brand-preview-card">
              <div className="brand-preview-head">
                <OrgAvatar />
                <div>
                  <b>{organization.name}</b>
                  <span>Enterprise workspace</span>
                </div>
                <Badge tone="green">LIVE</Badge>
              </div>
              <Progress value={72} />
              <div className="brand-preview-actions">
                <Button variant="secondary">Secondary action</Button>
                <Button onClick={() => notify("Brand preview action selected")}>
                  Primary action
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
