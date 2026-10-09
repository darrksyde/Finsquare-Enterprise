import { useMemo, useState } from "react"
import { Button, Modal } from "@/components/ui"
import { SearchInput } from "@/components/data-display/ManagementPrimitives"
import { printTable } from "@/features/wallet/domain/export"
import {
  ChannelBadge,
  CategoryBadge,
  DeliveryBadge,
  ExportButtons,
  KV,
  MessageStatusBadge,
  PagedTable,
  Panel,
} from "./CommunicationUi"
import { downloadCsv, fmtDate, money } from "@/features/loans/components/LoanUi"
import { preview } from "../domain/messaging"
import type { CommunicationsCtx } from "../hooks/useCommunications"
import type { Message, MessageChannel, MessageStatus } from "../types/message.types"

const CHANNEL_FILTERS: (MessageChannel | "All")[] = ["All", "SMS", "Email", "Both"]
const STATUS_FILTERS: (MessageStatus | "All")[] = ["All", "Sent", "Partially sent", "Scheduled", "Failed"]

/**
 * What has already gone out.
 *
 * A row shows what happened; the detail behind it shows who it happened to, which is the only way
 * to act on a `Partially sent` message. The message body and its delivery are one record, so they
 * open together rather than in two places.
 */
export function HistoryTab({ ctx }: { ctx: CommunicationsCtx }) {
  const [query, setQuery] = useState("")
  const [channel, setChannel] = useState<MessageChannel | "All">("All")
  const [status, setStatus] = useState<MessageStatus | "All">("All")
  const [openId, setOpenId] = useState<string | null>(null)

  const messages = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return ctx.messages.filter((message) => {
      const matchesQuery =
        !needle ||
        message.body.toLowerCase().includes(needle) ||
        (message.subject ?? "").toLowerCase().includes(needle) ||
        message.sender.toLowerCase().includes(needle) ||
        (message.context?.contributionName ?? "").toLowerCase().includes(needle) ||
        (message.context?.loanReference ?? "").toLowerCase().includes(needle)
      const matchesChannel = channel === "All" || message.channel === channel
      const matchesStatus = status === "All" || message.status === status
      return matchesQuery && matchesChannel && matchesStatus
    })
  }, [ctx.messages, query, channel, status])

  const open = messages.find((message) => message.id === openId) ?? null

  const exportRows = () =>
    messages.map((message) => [
      fmtDate(message.createdAt),
      message.category,
      message.channel,
      message.subject ?? message.body,
      message.recipientCount,
      message.deliveredCount,
      message.failedCount,
      message.cost,
      message.status,
      message.sender,
    ])

  const headers = [
    "Sent",
    "Category",
    "Channel",
    "Message",
    "Recipients",
    "Delivered",
    "Failed",
    "Cost",
    "Status",
    "Sender",
  ]

  return (
    <>
      <Panel
        title="History"
        subtitle={`${messages.length} of ${ctx.messages.length} ${ctx.messages.length === 1 ? "message" : "messages"}`}
        actions={
          <ExportButtons
            onCsv={() => downloadCsv("message-history", headers, exportRows())}
            onPdf={() => printTable("Message history", headers, exportRows())}
            disabled={messages.length === 0}
          />
        }
      >
        <div className="table-toolbar management-filter-bar">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search message, subject or sender"
          />
          <div className="management-filters">
            <select
              aria-label="Filter by channel"
              value={channel}
              onChange={(event) => setChannel(event.target.value as MessageChannel | "All")}
            >
              {CHANNEL_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "All channels" : option === "Both" ? "SMS + Email" : option}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              value={status}
              onChange={(event) => setStatus(event.target.value as MessageStatus | "All")}
            >
              {STATUS_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {option === "All" ? "All statuses" : option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <PagedTable
          rows={messages}
          rowKey={(message) => message.id}
          onRowClick={(message) => setOpenId(message.id)}
          pageSize={10}
          emptyText="No message matches those filters yet."
          columns={[
            {
              id: "message",
              header: "Message",
              render: (message) => (
                <span className="message-cell">
                  <b>{message.subject ?? preview(message.body)}</b>
                  <small>{message.subject ? preview(message.body) : message.category}</small>
                </span>
              ),
            },
            { id: "when", header: "When", render: (message) => fmtDate(message.scheduledFor ?? message.createdAt) },
            { id: "channel", header: "Channel", render: (message) => <ChannelBadge channel={message.channel} /> },
            {
              id: "recipients",
              header: "Recipients",
              render: (message) =>
                message.failedCount > 0 ? (
                  <span>
                    {message.recipientCount} · <span className="contribution-debit">{message.failedCount} failed</span>
                  </span>
                ) : (
                  message.recipientCount
                ),
            },
            { id: "sender", header: "Sender", render: (message) => message.sender },
            { id: "cost", header: "Cost", render: (message) => (message.cost > 0 ? money(message.cost) : "—") },
            { id: "status", header: "Status", render: (message) => <MessageStatusBadge status={message.status} /> },
          ]}
        />
      </Panel>

      {open && <MessageDetail message={open} onClose={() => setOpenId(null)} costPerSms={ctx.account?.costPerSms ?? 0} />}
    </>
  )
}

/** One message, everything about it: what was written, who it reached, and what it cost. */
function MessageDetail({
  message,
  onClose,
  costPerSms,
}: {
  message: Message
  onClose: () => void
  costPerSms: number
}) {
  const failed = message.recipients.filter((recipient) => recipient.status === "Failed")

  return (
    <Modal title={message.subject ?? `${message.category} message`} onClose={onClose} wide>
      <div className="wizard-body">
        <KV
          cols={2}
          items={[
            ["Channel", <ChannelBadge key="channel" channel={message.channel} />],
            ["Status", <MessageStatusBadge key="status" status={message.status} />],
            ["Category", <CategoryBadge key="category" category={message.category} />],
            ["Sent by", message.sender],
            [
              message.scheduledFor ? "Scheduled for" : "Sent",
              fmtDate(message.scheduledFor ?? message.sentAt ?? message.createdAt),
            ],
            [
              "Delivery",
              `${message.deliveredCount} of ${message.recipientCount} delivered${message.failedCount > 0 ? ` · ${message.failedCount} failed` : ""}`,
            ],
            [
              "Cost",
              message.cost > 0
                ? `${money(message.cost)} (${message.segments} × ${money(costPerSms)} per SMS)`
                : "No charge",
            ],
            [
              "Balance impact",
              message.cost > 0 ? `−${money(message.cost)}` : "None",
            ],
          ]}
        />

        {message.context && (message.context.contributionName ?? message.context.loanReference) && (
          <p className="contribution-hint">
            Drawn from {message.context.contributionName ?? message.context.loanReference}.
          </p>
        )}

        <div className="message-preview">
          <span>Message</span>
          <p>{message.body}</p>
        </div>

        {failed.length > 0 && (
          <div className="create-question">
            <div className="create-q">
              Not delivered
              <span className="recipient-count">{failed.length}</span>
            </div>
            <ul className="person-list">
              {failed.map((recipient) => (
                <li key={recipient.id}>
                  <span className="person-line">
                    <span className="person-name">{recipient.name}</span>
                    <span className="person-metric person-hide">
                      {recipient.channel === "SMS" ? recipient.phone ?? "No number" : recipient.email ?? "No address"}
                    </span>
                    <span className="person-metric">{recipient.failureReason ?? "Delivery failed"}</span>
                    <DeliveryBadge status={recipient.status} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <PagedTable
          rows={message.recipients}
          rowKey={(recipient) => recipient.id}
          pageSize={8}
          emptyText="This message had no recipients."
          columns={[
            { id: "name", header: "Recipient", render: (recipient) => <b>{recipient.name}</b> },
            { id: "channel", header: "Channel", render: (recipient) => recipient.channel },
            {
              id: "contact",
              header: "Contact",
              render: (recipient) => recipient.phone ?? recipient.email ?? "—",
            },
            { id: "status", header: "Delivery", render: (recipient) => <DeliveryBadge status={recipient.status} /> },
            {
              id: "cost",
              header: "Cost",
              render: (recipient) => (recipient.cost > 0 ? money(recipient.cost) : "—"),
            },
          ]}
        />
      </div>

      <div className="wizard-footer">
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
