import type { ReactNode } from "react"
import { Badge } from "@/components/ui"
import { ErrorState, LoadingState } from "@/components/feedback/AsyncState"
import { Mail, MessageSquareText, WalletCards, Zap } from "@/icons"
import { money } from "@/features/loans/components/LoanUi"
import { smsRemaining } from "../domain/messaging"
import type {
  DeliveryStatus,
  MessageCategory,
  MessageChannel,
  MessageStatus,
  SmsAccount,
} from "../types/message.types"

/**
 * Re-exported so a page or component in this feature never rebuilds a table, a modal or a stat
 * row. Only components are re-exported: the plain formatters (`money`, `fmtDate`, `downloadCsv`)
 * are imported straight from `features/loans/components/LoanUi` where they are needed, exactly as
 * the contributions feature does — re-exporting them here would break fast refresh for the file.
 */
export {
  ActionModal,
  ExportButtons,
  KV,
  NumField,
  PagedTable,
  Panel,
  Stats,
  TextArea,
} from "@/features/loans/components/LoanUi"
export { ActionMenu, Disclosure } from "@/components/ui"

type Tone = "neutral" | "blue" | "green" | "amber" | "red" | "purple"

const channelTones: Record<MessageChannel, Tone> = { SMS: "blue", Email: "purple", Both: "green" }
const channelLabels: Record<MessageChannel, string> = { SMS: "SMS", Email: "Email", Both: "SMS + Email" }

export const ChannelBadge = ({ channel }: { channel: MessageChannel }) => (
  <Badge tone={channelTones[channel]}>{channelLabels[channel]}</Badge>
)

const statusTones: Record<MessageStatus, Tone> = {
  Sent: "green",
  Scheduled: "purple",
  Failed: "red",
  "Partially sent": "amber",
}

export const MessageStatusBadge = ({ status }: { status: MessageStatus }) => (
  <Badge tone={statusTones[status]}>{status}</Badge>
)

const deliveryTones: Record<DeliveryStatus, Tone> = { Delivered: "green", Failed: "red", Pending: "amber" }
export const DeliveryBadge = ({ status }: { status: DeliveryStatus }) => (
  <Badge tone={deliveryTones[status]}>{status}</Badge>
)

const categoryTones: Record<MessageCategory, Tone> = {
  General: "neutral",
  "Contribution reminder": "blue",
  "Loan reminder": "amber",
}
export const CategoryBadge = ({ category }: { category: MessageCategory }) => (
  <Badge tone={categoryTones[category]}>{category}</Badge>
)

/** The icon for a channel, used in the composer's choice cards. */
export const ChannelIcon = ({ channel }: { channel: MessageChannel }) => {
  if (channel === "Email") return <Mail size={15} />
  if (channel === "Both") return <Zap size={15} />
  return <MessageSquareText size={15} />
}

/**
 * The balance the whole workspace runs on, and the only place it can be funded from.
 *
 * The figure in charge is the balance; the number of texts it buys and the unit price are facts
 * beside it, because "how many messages can I still send" is the question that matters.
 */
export function SmsBalance({ account, children }: { account: SmsAccount; children?: ReactNode }) {
  const left = smsRemaining(account.balance, account.costPerSms)
  return (
    <div className="sms-balance">
      <div className="sms-balance-main">
        <span>SMS balance</span>
        <b>{money(account.balance)}</b>
        <small>
          ~{left.toLocaleString("en-NG")} {left === 1 ? "SMS" : "SMS"} left · {money(account.costPerSms)} per SMS
        </small>
      </div>
      <div className="sms-balance-actions">
        <span className="meta-note">
          <WalletCards size={14} />
          Funded from the organization wallet
        </span>
        {children}
      </div>
    </div>
  )
}

export function CommunicationShell({
  children,
  status,
  error,
  retry,
}: {
  children: ReactNode
  status: "idle" | "loading" | "success" | "error"
  error: string | null
  retry: () => void
}) {
  if (status === "error") return <ErrorState message={error ?? "Communications could not be loaded."} retry={retry} />
  if (status === "loading" || status === "idle") return <LoadingState label="Loading communications…" />
  return <>{children}</>
}

export interface CommunicationPageProps {
  notify: (message: string) => void
}
