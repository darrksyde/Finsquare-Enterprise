import { useState } from "react"
import { Button, Tabs } from "@/components/ui"
import { ShellPage } from "@/components/layout/ShellPage"
import { WalletCards } from "@/icons"
import {
  CommunicationShell,
  SmsBalance,
  type CommunicationPageProps,
} from "../components/CommunicationUi"
import { money } from "@/features/loans/components/LoanUi"
import { ComposeTab } from "../components/ComposeTab"
import { HistoryTab } from "../components/HistoryTab"
import { TopUpBalance } from "../components/TopUpBalance"
import { useCommunications } from "../hooks/useCommunications"

type Tab = "compose" | "history"

/**
 * The Communications workspace.
 *
 * The layout answers the four questions in order: the balance block says what sending costs and
 * where the money comes from, then Compose and History split what is about to go out from what
 * already did. There is one primary action on the page — funding the balance — and one per message
 * — reviewing and sending.
 */
export default function CommunicationsPage({ notify }: CommunicationPageProps) {
  const ctx = useCommunications()
  const [tab, setTab] = useState<Tab>("compose")
  const [toppingUp, setToppingUp] = useState(false)

  return (
    <>
      <ShellPage
        title="Communications"
        description="Message members, groups and branches by SMS or email — and see what it costs before you send."
        width={tab === "compose" ? "narrow" : undefined}
        meta={
          ctx.status === "success" ? (
            <>
              <span className="meta-note">
                {ctx.summary.total} {ctx.summary.total === 1 ? "message" : "messages"} sent
              </span>
              <span className="meta-note">{money(ctx.summary.spend)} spent on messaging</span>
            </>
          ) : undefined
        }
      >
        <CommunicationShell status={ctx.status} error={ctx.error} retry={ctx.retry}>
          {ctx.account && (
            <SmsBalance account={ctx.account}>
              <Button
                variant="secondary"
                icon={WalletCards}
                disabled={!ctx.can("communication.manage_balance")}
                onClick={() => setToppingUp(true)}
              >
                Top up from wallet
              </Button>
            </SmsBalance>
          )}

          <Tabs
            tabs={[
              { id: "compose" as Tab, label: "Compose" },
              { id: "history" as Tab, label: "History", count: ctx.messages.length || undefined },
            ]}
            value={tab}
            onChange={setTab}
          />

          {tab === "compose" ? <ComposeTab ctx={ctx} notify={notify} /> : <HistoryTab ctx={ctx} />}
        </CommunicationShell>
      </ShellPage>

      {toppingUp && <TopUpBalance ctx={ctx} onClose={() => setToppingUp(false)} notify={notify} />}
    </>
  )
}
