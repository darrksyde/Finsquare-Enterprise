import {
  Banknote,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  FileText,
  HandCoins,
  Landmark,
  LockKeyhole,
  Network,
  Plus,
  ReceiptText,
  ShieldCheck,
  Upload,
  UserCog,
  UserPlus,
  Users,
} from "@/icons"
import { Button, Badge, SectionHeader } from "@/components/ui"
import type { ReactNode } from "react"
import type { View } from "@/types"
import {
  attentionItemsMock,
  dashboardMetricsMock,
  recentActivityMock,
} from "./mocks/dashboard.mock"

type ActivityKind = (typeof recentActivityMock)[number]["kind"]

/** Icon and dot colour per activity kind, kept in the page because the mock holds data, not design. */
const ACTIVITY_STYLES: Record<ActivityKind, [ReactNode, string]> = {
  members: [<Users size={14} key="members" />, "blue"],
  administrator: [<UserCog size={14} key="administrator" />, "purple"],
  compliance: [<FileText size={14} key="compliance" />, "amber"],
}

export function Dashboard({
  live,
  setView,
  onImport,
}: {
  live: boolean
  setView: (v: View) => void
  onImport: () => void
}) {
  const metricIcons = {
    members: Users,
    groups: Network,
    contributions: HandCoins,
    dues: ReceiptText,
    loans: Banknote,
    approvals: ClipboardCheck,
  }
  return (
    <div className="page">
      <SectionHeader
        eyebrow="MONDAY, 26 MAY"
        title="Overview"
        description="Good afternoon, Admin. Here’s what is happening with Lagos Farmers Cooperative."
        actions={
          <Button icon={Plus} onClick={() => setView("members")}>
            Add member
          </Button>
        }
      />
      <div className="stat-grid">
        {dashboardMetricsMock.map((metric) => {
          const Icon = metricIcons[metric.id]
          return (
            <div className="stat-card" key={metric.id}>
              <div className="stat-top">
                <span>{metric.label}</span>
                <Icon size={16} />
              </div>
              <div className="stat-value">{metric.value}</div>
              <div className="stat-sub">{metric.detail}</div>
            </div>
          )
        })}
      </div>
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-head">
            <div>
              <b>Needs attention</b>
              <span>Items that may block your organization’s progress</span>
            </div>
            <Badge tone="amber">5 open</Badge>
          </div>
          <div className="attention-list">
            {attentionItemsMock.map((item, index) => (
              <button
                type="button"
                key={item.label}
                onClick={() => setView(item.target as View)}
              >
                <div className="attention-icon">
                  {index === 3 ? (
                    <Landmark size={16} />
                  ) : index === 4 ? (
                    <ShieldCheck size={16} />
                  ) : (
                    <Clock3 size={16} />
                  )}
                </div>
                <div>
                  <b>{item.label}</b>
                  <span>{item.category}</span>
                </div>
                <ChevronRight size={15} />
              </button>
            ))}
          </div>
        </section>
        <section className="panel quick-panel">
          <div className="panel-head">
            <div>
              <b>Quick actions</b>
              <span>Common organization tasks</span>
            </div>
          </div>
          <div className="quick-grid">
            <button type="button" onClick={() => setView("members")}>
              <UserPlus size={17} />
              Add member
            </button>
            <button type="button" onClick={onImport}>
              <Upload size={17} />
              Import members
            </button>
            <button type="button" onClick={() => setView("contributions")}>
              <HandCoins size={17} />
              Create contribution
            </button>
            <button type="button" onClick={() => setView("dues")}>
              <ReceiptText size={17} />
              Create dues
            </button>
            <button type="button" onClick={() => setView("loans")}>
              <Banknote size={17} />
              Create loan product
            </button>
            <button type="button" onClick={() => setView("administrators")}>
              <UserCog size={17} />
              Invite administrator
            </button>
          </div>
          <div className={`transaction-note ${live ? "enabled" : ""}`}>
            <div>
              <LockKeyhole size={15} />
              <span>
                <b>
                  {live
                    ? "Financial actions are enabled"
                    : "Financial actions are not enabled yet"}
                </b>
                <small>
                  {live
                    ? "You can record payments and create transfers."
                    : "Configuration is saved, but no money can move yet."}
                </small>
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={() => setView(live ? "wallet" : "corporate")}
            >
              {live ? "Record payment" : "View requirements"}
            </Button>
          </div>
        </section>
      </div>
      <section className="panel recent-panel">
        <div className="panel-head">
          <div>
            <b>Recent activity</b>
            <span>Latest changes across your workspace</span>
          </div>
        </div>
        {recentActivityMock.map((entry) => {
          const [icon, tone] = ACTIVITY_STYLES[entry.kind]
          return (
            <div className="activity-row" key={entry.id}>
              <div className={`activity-dot ${tone}`}>{icon}</div>
              <div>
                <b>{entry.title}</b>
                <span>{entry.detail}</span>
              </div>
              <time>{entry.when}</time>
            </div>
          )
        })}
      </section>
    </div>
  )
}
