import { useState } from "react"
import { ShellPage } from "@/components/layout/ShellPage"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
import { ContributionReportsPage } from "@/features/contributions"
import { DuesReportsPage } from "@/features/dues"
import { LoanReportsPage } from "@/features/loans"
import { WalletPage } from "@/features/wallet/components/WalletShell"
import WalletReports from "@/features/wallet/components/WalletReports"
import type { View } from "@/types"

type Kind = "loans" | "wallet" | "contributions" | "dues"

/** Central place for every report. Each module contributes a tab when it is enabled and permitted. */
export default function ReportsPage({ navigate, notify, enabled }: { navigate: (view: View, id?: string) => void; notify: (m: string) => void; enabled: ReadonlySet<string> }) {
  const { can } = useAuthorization()
  const tabs = [
    ...(enabled.has("loans") && can("loans.view") ? [{ id: "loans" as Kind, label: "Loans" }] : []),
    ...(enabled.has("wallet") && can("wallet.view") ? [{ id: "wallet" as Kind, label: "Wallet" }] : []),
    ...(enabled.has("contributions") && can("contributions.view") ? [{ id: "contributions" as Kind, label: "Contributions" }] : []),
    ...(enabled.has("dues") && can("dues.view") ? [{ id: "dues" as Kind, label: "Dues" }] : []),
  ]
  const [tab, setTab] = useState<Kind>(tabs[0]?.id ?? "loans")
  const active = tabs.find((t) => t.id === tab)?.id ?? tabs[0]?.id
  return (
    <ShellPage
      level="index"
      title="Reports"
      description="Every report in one place. Choose an area to see its reports."
      actions={
        tabs.length > 1 ? (
          <div className="contribution-filters">
            <select value={active ?? ""} onChange={(event) => setTab(event.target.value as Kind)} aria-label="Report area">
              {tabs.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>
        ) : undefined
      }
    >
      {!active ? <div className="tab-empty"><b>No reports available</b><span>Enable a module such as Contributions, Loans or Wallet to see its reports.</span></div> : (
        <>
          {active === "loans" && <LoanReportsPage navigate={navigate} notify={notify} embedded />}
          {active === "wallet" && <WalletPage navigate={navigate} notify={notify} bare>{(ctx) => <WalletReports ctx={ctx} />}</WalletPage>}
          {active === "contributions" && <ContributionReportsPage embedded view="contributions" navigate={navigate} notify={notify} />}
          {active === "dues" && <DuesReportsPage embedded />}
        </>
      )}
    </ShellPage>
  )
}
