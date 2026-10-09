import { Badge, Button, SectionHeader } from "@/components/ui"
import { CheckCircle2, Pencil, Plus, ReceiptText } from "@/icons"

/** Membership dues. Contributions live in `features/contributions`. */
export function DuesPage({ notify }: { notify: (s: string) => void }) {
  return (
    <div className="page">
      <SectionHeader
        eyebrow="FINANCE"
        title="Membership dues"
        description="Configure annual and recurring dues for eligible members."
        actions={
          <Button
            icon={Plus}
            onClick={() => notify("Dues setup saved as draft")}
          >
            Create dues
          </Button>
        }
      />
      <section className="panel config-overview">
        <div className="config-title">
          <div className="scheme-icon purple">
            <ReceiptText size={20} />
          </div>
          <div>
            <div className="scheme-title">
              Annual Membership Dues <Badge tone="blue">Configured</Badge>
            </div>
            <span>Annual obligations for all active cooperative members.</span>
          </div>
          <Button variant="secondary" icon={Pencil}>
            Edit configuration
          </Button>
        </div>
        <div className="config-grid">
          <div>
            <span>Amount</span>
            <b>₦25,000</b>
          </div>
          <div>
            <span>Frequency</span>
            <b>Annual</b>
          </div>
          <div>
            <span>Eligibility</span>
            <b>All active members</b>
          </div>
          <div>
            <span>Due date</span>
            <b>30 June 2025</b>
          </div>
        </div>
        <div className="rules-list">
          <div>
            <CheckCircle2 size={16} />
            <span>
              <b>Payment methods</b>Bank transfer, card, account balance and
              manual recording
            </span>
          </div>
          <div>
            <CheckCircle2 size={16} />
            <span>
              <b>Reminder schedule</b>14 days and 3 days before due date
            </span>
          </div>
          <div>
            <CheckCircle2 size={16} />
            <span>
              <b>Late payment</b>7-day grace period; no penalty configured
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}
