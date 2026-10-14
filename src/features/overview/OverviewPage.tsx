import {
  Banknote,
  ChevronRight,
  ClipboardCheck,
  Clock3,
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
import { EmptyState, ErrorState, LoadingState } from "@/components/feedback/AsyncState"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
import { useDashboard } from "./hooks/useDashboard"
import type { Metric } from "./domain/dashboard"
import type { View } from "@/types"

const METRIC_ICONS: Record<Metric["id"], typeof Users> = {
  members: Users,
  groups: Network,
  contributions: HandCoins,
  dues: ReceiptText,
  loans: Banknote,
  approvals: ClipboardCheck,
}

/** The two setup items read differently from the record queues, so they get their own icons. */
const ATTENTION_ICONS: Record<string, typeof Clock3> = {
  corporate: Landmark,
  compliance: ShieldCheck,
}

/**
 * The overview of the active community.
 *
 * Every figure comes from the records that community actually has — nothing here is written in — so
 * switching communities changes the numbers, and a community with no records gets a get-started panel
 * instead of six cards reading zero.
 */
export function Dashboard({
  live,
  setView,
  onImport,
  administratorName,
  organizationName,
}: {
  live: boolean
  setView: (v: View) => void
  onImport: () => void
  administratorName: string
  organizationName: string
}) {
  const { status, error, retry, metrics, attention, latestMembers, hasNoRecords, eyebrow, greeting } = useDashboard()
  const { can } = useAuthorization()

  return (
    <div className="page">
      <SectionHeader
        eyebrow={eyebrow}
        title="Overview"
        description={`${greeting}, ${administratorName}. Here’s what is happening with ${organizationName}.`}
        actions={
          can("members.create") ? (
            <Button icon={Plus} onClick={() => setView("members")}>
              Add member
            </Button>
          ) : undefined
        }
      />

      {status === "error" && <ErrorState message={error ?? "The overview could not be loaded."} retry={retry} />}
      {status === "loading" && <LoadingState label="Loading overview…" />}

      {status === "success" && hasNoRecords && (
        <section className="panel" style={{ padding: 20 }}>
          <EmptyState
            title="Nothing here yet"
            description={`${organizationName} has no members, groups or plans yet. Start with a member, or choose the modules you want to work with.`}
          />
          <div className="quick-grid" style={{ marginTop: 14 }}>
            {can("members.create") && (
              <button type="button" onClick={() => setView("members")}>
                <UserPlus size={17} />
                Add member
              </button>
            )}
            {can("members.import") && (
              <button type="button" onClick={onImport}>
                <Upload size={17} />
                Import members
              </button>
            )}
            {can("settings.manage") && (
              <button type="button" onClick={() => setView("modules")}>
                <UserCog size={17} />
                Choose modules
              </button>
            )}
            {can("settings.manage") && (
              <button type="button" onClick={() => setView("corporate")}>
                <Landmark size={17} />
                Connect corporate account
              </button>
            )}
          </div>
        </section>
      )}

      {status === "success" && !hasNoRecords && (
        <>
          <div className="stat-grid">
            {metrics.map((metric) => {
              const Icon = METRIC_ICONS[metric.id]
              return (
                <button type="button" className="stat-card" key={metric.id} onClick={() => setView(metric.target)}>
                  <div className="stat-top">
                    <span>{metric.label}</span>
                    <Icon size={16} />
                  </div>
                  <div className="stat-value">{metric.value}</div>
                  <div className="stat-sub">{metric.detail}</div>
                </button>
              )
            })}
          </div>
          <div className="dashboard-grid">
            <section className="panel">
              <div className="panel-head">
                <div>
                  <b>Needs attention</b>
                  <span>Items that may block {organizationName}’s progress</span>
                </div>
                {attention.length > 0 && <Badge tone="amber">{attention.length} open</Badge>}
              </div>
              {attention.length === 0 ? (
                <EmptyState
                  title="Nothing needs you"
                  description="No approvals, applications or setup steps are waiting."
                />
              ) : (
                <div className="attention-list">
                  {attention.map((item) => {
                    const Icon = ATTENTION_ICONS[item.id] ?? Clock3
                    return (
                      <button type="button" key={item.id} onClick={() => setView(item.target)}>
                        <div className="attention-icon">
                          <Icon size={16} />
                        </div>
                        <div>
                          <b>{item.label}</b>
                          <span>{item.category}</span>
                        </div>
                        <ChevronRight size={15} />
                      </button>
                    )
                  })}
                </div>
              )}
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
                    <b>{live ? "Financial actions are enabled" : "Financial actions are not enabled yet"}</b>
                    <small>
                      {live
                        ? "You can record payments and create transfers."
                        : "Configuration is saved, but no money can move yet."}
                    </small>
                  </span>
                </div>
                <Button variant="secondary" onClick={() => setView(live ? "wallet" : "corporate")}>
                  {live ? "Record payment" : "View requirements"}
                </Button>
              </div>
            </section>
          </div>
          <section className="panel recent-panel">
            <div className="panel-head">
              <div>
                <b>Latest members</b>
                <span>The most recent records added to {organizationName}</span>
              </div>
              {latestMembers.length > 0 && (
                <Button variant="ghost" onClick={() => setView("members")}>
                  View all
                </Button>
              )}
            </div>
            {latestMembers.length === 0 ? (
              <EmptyState title="No members yet" description="Members you add or import will appear here." />
            ) : (
              latestMembers.map((member) => (
                <div className="activity-row" key={member.id}>
                  <div className="activity-dot blue">
                    <Users size={14} />
                  </div>
                  <div>
                    <b>{member.name}</b>
                    <span>
                      {member.group} · {member.status}
                    </span>
                  </div>
                  {/* `joinedAt` is already a display date in the members register, so it is shown as it is. */}
                  <span className="activity-when">{member.joinedAt}</span>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Dashboard
