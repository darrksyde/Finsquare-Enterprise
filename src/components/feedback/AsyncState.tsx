import type { ReactNode } from "react"
import { Button } from "@/components/ui"

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="tab-empty">
      <span>{label}</span>
    </div>
  )
}

export function ErrorState({
  message,
  retry,
}: {
  message: string
  retry?: () => void
}) {
  return (
    <div role="alert" className="tab-empty">
      <b>Unable to load this information</b>
      <span>{message}</span>
      {retry && (
        <Button variant="secondary" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="tab-empty">
      <b>{title}</b>
      <span>{description}</span>
      {action}
    </div>
  )
}

export function AccessDeniedState({
  title = "This module is not available",
  description = "Enable the required module or contact an organization administrator.",
}: {
  title?: string
  description?: string
}) {
  return (
    <div role="alert" className="tab-empty">
      <b>{title}</b>
      <span>{description}</span>
    </div>
  )
}
