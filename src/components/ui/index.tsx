import type { ReactNode } from "react"
import { Check, X, type IconType } from "@/icons"

export { Tabs } from "./Tabs"
export type { TabItem } from "./Tabs"
export { Disclosure } from "./Disclosure"
export { ActionMenu } from "./ActionMenu"
export type { ActionMenuItem } from "./ActionMenu"

export function Button({
  children,
  variant = "primary",
  icon: Icon,
  disabled,
  onClick,
  className = "",
  title,
  type = "button",
}: {
  children?: ReactNode
  variant?: "primary" | "secondary" | "ghost" | "danger"
  icon?: IconType
  disabled?: boolean
  onClick?: () => void
  className?: string
  title?: string
  type?: "button" | "submit"
}) {
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`btn btn-${variant} ${className}`}
    >
      {Icon && <Icon size={15} />}
      {children}
    </button>
  )
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  active = false,
}: {
  icon: IconType
  label: string
  onClick?: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      className={`icon-btn ${active ? "active" : ""}`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon size={17} />
    </button>
  )
}

export function Field({
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  label: string
  value?: string
  placeholder?: string
  type?: string
  onChange?: (value: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  )
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange?: (value: string) => void
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange?.(e.target.value)}>
        {options.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode
  tone?: "neutral" | "blue" | "green" | "amber" | "red" | "purple"
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="progress">
      <div style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}

export function Toggle({
  value,
  onChange,
}: {
  value: boolean
  onChange?: () => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      className={`toggle ${value ? "on" : ""}`}
      onClick={onChange}
    >
      <span />
    </button>
  )
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        className={`modal ${wide ? "modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <IconButton icon={X} label="Close" onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  /** Chips describing the record (status, type, holder). They belong in the header. */
  meta?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <div className="page-title">{title}</div>
        {description && <div className="page-description">{description}</div>}
        {meta && <div className="page-meta">{meta}</div>}
      </div>
      {actions && <div className="header-actions">{actions}</div>}
    </div>
  )
}

interface StepperProps {
  steps: string[]
  active: number
}

export function Stepper({ steps, active }: StepperProps) {
  return (
    <div className="stepper">
      {steps.map((step, index) => (
        <div
          className={`step ${
            index < active ? "done" : index === active ? "active" : ""
          }`}
          key={step}
        >
          <span>{index < active ? <Check size={12} /> : index + 1}</span>
          <div>{step}</div>
        </div>
      ))}
    </div>
  )
}
