import { useMemo, useState } from "react"
import { Button } from "@/components/ui"
import { ActionModal, ChannelBadge, ChannelIcon, KV, Panel } from "./CommunicationUi"
import { money } from "@/features/loans/components/LoanUi"
import { RecipientPicker } from "./RecipientPicker"
import { ReminderPicker, type GeneratedReminder } from "./ReminderPicker"
import { emptySelection, resolveRecipients, type RecipientSelection } from "../domain/recipients"
import { estimateCost, personalise, usesNameToken, NAME_TOKEN } from "../domain/messaging"
import { firstError, messageDraftSchema } from "../schemas/message.schema"
import { useGroupMemberships } from "../hooks/useGroupMemberships"
import type { CommunicationsCtx } from "../hooks/useCommunications"
import type { MessageChannel, MessageCategory, MessageContext } from "../types/message.types"

const CHANNELS: { id: MessageChannel; label: string; hint: string }[] = [
  { id: "SMS", label: "SMS", hint: "Text message to a phone number" },
  { id: "Email", label: "Email", hint: "Goes to the member's email address" },
  { id: "Both", label: "SMS + Email", hint: "Reach people on whichever they have" },
]

type Shortcut = "blank" | "Contribution reminder" | "Loan reminder" | "Dues reminder"

/**
 * Compose: who, what, how much, send.
 *
 * The order is deliberate — choose the channel, write the message, choose the people — because the
 * cost only becomes real once the message and the audience both exist, and the cost is what the
 * confirm step asks the administrator to agree to.
 *
 * Only the fields an answer needs are shown: the subject appears once email is involved, the
 * shortcut pickers appear only when a reminder is chosen, and the cost meter appears as soon as
 * there is something to cost.
 */
export function ComposeTab({ ctx, notify }: { ctx: CommunicationsCtx; notify: (message: string) => void }) {
  const [channel, setChannel] = useState<MessageChannel>("SMS")
  const [category, setCategory] = useState<MessageCategory>("General")
  const [shortcut, setShortcut] = useState<Shortcut>("blank")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [selection, setSelection] = useState<RecipientSelection>(emptySelection)
  const [context, setContext] = useState<MessageContext | undefined>(undefined)
  const [confirming, setConfirming] = useState(false)
  /** The template as generated, so switching back to a blank message can tell the text apart from an edit. */
  const [generated, setGenerated] = useState<{ subject: string; body: string } | null>(null)

  const memberships = useGroupMemberships(selection.groupIds)
  const recipients = useMemo(
    () => resolveRecipients({ members: ctx.members, memberships, selection }),
    [ctx.members, memberships, selection],
  )

  const costPerSms = ctx.account?.costPerSms ?? 0
  const cost = useMemo(
    () => estimateCost({ channel, body, recipients, costPerSms }),
    [channel, body, recipients, costPerSms],
  )
  const balance = ctx.account?.balance ?? 0
  const shortfall = cost.total > balance

  const draft = messageDraftSchema.safeParse({
    channel,
    category,
    subject,
    body,
    recipientCount: recipients.length,
  })
  const validationError = firstError(draft)
  const blocked = ctx.mode === "blocked"

  const useReminder = (reminder: GeneratedReminder) => {
    setCategory(reminder.category)
    setSubject(reminder.subject)
    setBody(reminder.body)
    setContext(reminder.context)
    setGenerated({ subject: reminder.subject, body: reminder.body })
    setSelection({ allMembers: false, memberIds: reminder.memberIds, groupIds: [], branchIds: [], status: "All" })
  }

  const chooseShortcut = (next: Shortcut) => {
    setShortcut(next)
    if (next !== "blank") {
      setCategory(next)
      return
    }
    setCategory("General")
    setContext(undefined)
    // Going back to a blank message discards the template we generated, but never an edit: text the
    // administrator has changed is theirs, and only the untouched template is thrown away.
    if (generated && body === generated.body && subject === generated.subject) {
      setBody("")
      setSubject("")
      setGenerated(null)
    }
  }

  const reset = () => {
    setShortcut("blank")
    setCategory("General")
    setSubject("")
    setBody("")
    setContext(undefined)
    setGenerated(null)
    setSelection(emptySelection)
  }

  const send = async () => {
    if (validationError) throw new Error(validationError)
    const message = await ctx.sendMessage({
      category,
      channel,
      subject: channel === "SMS" ? undefined : subject,
      body,
      recipients,
      context,
    })
    notify(
      message.status === "Sent"
        ? `Sent to ${message.recipientCount} ${message.recipientCount === 1 ? "recipient" : "recipients"} · ${money(message.cost)}`
        : `${message.status} to ${message.recipientCount} ${message.recipientCount === 1 ? "recipient" : "recipients"} · ${money(message.cost)}`,
    )
    setConfirming(false)
    reset()
  }

  return (
    <>
      <Panel
        title="New message"
        subtitle="Choose how to send it, write it, then pick who receives it"
      >
        <div className="create-form">
          <div className="create-question">
            <div className="create-q">How should it send?</div>
            <div className="choice-row">
              {CHANNELS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="choice"
                  aria-pressed={channel === option.id}
                  onClick={() => setChannel(option.id)}
                >
                  <b>
                    <ChannelIcon channel={option.id} /> {option.label}
                  </b>
                  <small>{option.hint}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="create-question">
            <div className="create-q">Start from</div>
            <div className="choice-row">
              <button
                type="button"
                className="choice"
                aria-pressed={shortcut === "blank"}
                onClick={() => chooseShortcut("blank")}
              >
                <b>Blank message</b>
                <small>Write it yourself</small>
              </button>
              {ctx.enabledModules.includes("contributions") && (
                <button
                  type="button"
                  className="choice"
                  aria-pressed={shortcut === "Contribution reminder"}
                  onClick={() => chooseShortcut("Contribution reminder")}
                >
                  <b>Contribution reminder</b>
                  <small>From a plan's amount and due date</small>
                </button>
              )}
              {ctx.enabledModules.includes("loans") && (
                <button
                  type="button"
                  className="choice"
                  aria-pressed={shortcut === "Loan reminder"}
                  onClick={() => chooseShortcut("Loan reminder")}
                >
                  <b>Loan reminder</b>
                  <small>From a borrower's next instalment</small>
                </button>
              )}
              {ctx.enabledModules.includes("dues") && (
                <button
                  type="button"
                  className="choice"
                  aria-pressed={shortcut === "Dues reminder"}
                  onClick={() => chooseShortcut("Dues reminder")}
                >
                  <b>Dues reminder</b>
                  <small>From a plan's outstanding dues</small>
                </button>
              )}
            </div>
            {shortcut !== "blank" && <ReminderPicker kind={shortcut} onGenerate={useReminder} />}
          </div>

          <div className="create-question">
            <div className="create-q">Message</div>
            {channel !== "SMS" && (
              <label className="field">
                <span>Subject</span>
                <input
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="What is this about?"
                />
              </label>
            )}
            <label className="field span-2">
              <span className="sr-only">Message</span>
              <textarea
                rows={5}
                value={body}
                placeholder="Write the message…"
                onChange={(event) => setBody(event.target.value)}
              />
            </label>
            <div className="compose-meter" role="status">
              <span>
                {body.trim().length.toLocaleString("en-NG")} characters
                {channel !== "Email" && cost.segments > 1 ? ` · ${cost.segments} SMS parts each` : ""}
              </span>
              <span>
                {recipients.length} {recipients.length === 1 ? "recipient" : "recipients"}
              </span>
              <span className={shortfall ? "contribution-debit" : undefined}>
                {cost.total > 0 ? `${money(cost.total)}${channel !== "Email" ? ` from ${money(balance)}` : ""}` : "No charge"}
              </span>
            </div>
            {usesNameToken(body) ? (
              <p className="contribution-hint">
                {NAME_TOKEN} is replaced with each person&apos;s first name
                {recipients.length > 0 ? ` — “${personalise(body, recipients[0].name).slice(0, 90)}…”` : ""}
              </p>
            ) : (
              body.trim().length > 0 && (
                <p className="contribution-hint">
                  Tip: write {NAME_TOKEN} to greet each person by name.
                </p>
              )
            )}
          </div>

          <RecipientPicker ctx={ctx} selection={selection} onChange={setSelection} recipients={recipients} />

          {cost.unreachable > 0 && (
            <p className="contribution-hint">
              {cost.unreachable} {cost.unreachable === 1 ? "person has" : "people have"} neither a phone number nor
              an email address, so{" "}
              {cost.unreachable === 1 ? "they will not be reached" : "they will not be reached"}.
            </p>
          )}

          <div className="create-footer">
            <span className="compose-total">
              <b>{money(cost.total)}</b>
              {cost.smsRecipients > 0 && (
                <small>
                  {cost.smsRecipients} × {cost.segments} SMS {cost.segments === 1 ? "part" : "parts"}
                </small>
              )}
            </span>
            <div className="create-actions">
              <Button variant="ghost" onClick={reset}>
                Reset
              </Button>
              <Button
                disabled={Boolean(validationError) || blocked}
                onClick={() => setConfirming(true)}
              >
                Review and send
              </Button>
            </div>
          </div>

          {validationError && <p className="contribution-hint">{validationError}</p>}
          {shortfall && (
            <p className="contribution-hint contribution-debit">
              This send costs more than the SMS balance. Top up the balance to continue.
            </p>
          )}
          {blocked && (
            <p className="contribution-hint contribution-debit">
              Money movement is disabled in this environment, so messages cannot be charged or sent.
            </p>
          )}
        </div>
      </Panel>

      {confirming && (
        <ActionModal
          title="Send this message?"
          onClose={() => setConfirming(false)}
          onSubmit={send}
          submitLabel={ctx.mode === "simulated" ? `Send ${money(cost.total)} (demo)` : `Send ${money(cost.total)}`}
          wide
        >
          <KV
            cols={2}
            items={[
              ["Channel", <ChannelBadge key="channel" channel={channel} />],
              ["Recipients", `${recipients.length} ${recipients.length === 1 ? "person" : "people"}`],
              ["Cost", cost.total > 0 ? `${money(cost.total)} (${cost.smsRecipients} × ${cost.segments} SMS)` : "No charge"],
              ["SMS balance", `${money(balance)} → ${money(balance - cost.total)}`],
            ]}
          />

          {channel !== "SMS" && subject.trim() && (
            <p className="contribution-hint">
              <b>Subject:</b> {subject}
            </p>
          )}

          <div className="message-preview">
            <span>First message goes out as</span>
            <p>
              {recipients.length > 0 ? personalise(body, recipients[0].name) : body}
              {recipients.length > 1 ? `\n\n…and ${recipients.length - 1} more.` : ""}
            </p>
          </div>

          {ctx.mode !== "live" && (
            <p className="contribution-hint">
              Demo mode: the message is recorded and the balance moves, but nothing is really delivered.
            </p>
          )}
        </ActionModal>
      )}
    </>
  )
}
