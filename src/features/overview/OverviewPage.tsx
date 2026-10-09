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
import type { View } from "@/types"
import {
  attentionItemsMock,
  dashboardMetricsMock,
} from "./mocks/dashboard.mock"

export function Dashboard({
  live,
  setView,
  onImport,
  notify,
}: {
  live: boolean
  setView: (v: View) => void
  onImport: () => void
  notify: (text: string) => void
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
                    : "Financial actions are in test mode"}
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
              onClick={() =>
                notify("New payment flow opened")
              }
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
          <Button variant="ghost">View all</Button>
        </div>
        <div className="activity-row">
          <div className="activity-dot blue">
            <Users size={14} />
          </div>
          <div>
            <b>Member import completed</b>
            <span>2,421 member records were added</span>
          </div>
          <time>18 min ago</time>
        </div>
        <div className="activity-row">
          <div className="activity-dot purple">
            <UserCog size={14} />
          </div>
          <div>
            <b>Administrator invited</b>
            <span>Taiwo Akinyemi · Finance Officer</span>
          </div>
          <time>2 hrs ago</time>
        </div>
        <div className="activity-row">
          <div className="activity-dot amber">
            <FileText size={14} />
          </div>
          <div>
            <b>Compliance document updated</b>
            <span>Board resolution was requested</span>
          </div>
          <time>Yesterday</time>
        </div>
      </section>
    </div>
  )
}
