import { useState } from "react"
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Network,
  ShieldCheck,
  X,
} from "@/icons"
import {
  Badge,
  Button,
  IconButton,
  Modal,
  Stepper,
} from "@/components/ui"
import { membersMock as members } from "@/features/members/mocks/members.mock"
import { enterpriseModules as modules } from "@/app/config/module-registry"

export function ImportModal({
  onClose,
  onComplete,
}: {
  onClose: () => void
  onComplete: () => void
}) {
  const [step, setStep] = useState(0)
  const labels = ["Upload CSV", "Map fields", "Review", "Import"]
  return (
    <Modal title="Import members" onClose={onClose} wide>
      <Stepper steps={labels} active={step} />
      <div className="wizard-body">
        {step === 0 && (
          <>
            <div className="uploaded-file">
              <div className="file-icon">
                <FileText size={22} />
              </div>
              <div>
                <b>lagos-farmers-members.csv</b>
                <span>2,438 records detected · 284 KB</span>
              </div>
              <Badge tone="green">Ready</Badge>
              <IconButton icon={X} label="Remove file" />
            </div>
            <div className="preview-table">
              <div className="mini-table-head">
                <span>Full Name</span>
                <span>Phone</span>
                <span>Branch</span>
                <span>Group</span>
              </div>
              {members.slice(0, 3).map((m) => (
                <div key={m.id}>
                  <span>{m.name}</span>
                  <span>{m.phone}</span>
                  <span>Ikeja</span>
                  <span>{m.group}</span>
                </div>
              ))}
            </div>
          </>
        )}
        {step === 1 && (
          <div className="mapping-list">
            <div className="mapping-head">
              <span>CSV column</span>
              <span>FinSquare field</span>
              <span>Status</span>
            </div>
            {[
              "Full Name",
              "Phone",
              "Email",
              "Membership Number",
              "Branch",
              "Group",
              "Date Joined",
            ].map((f) => (
              <div key={f}>
                <span>{f}</span>
                <ArrowRight size={14} />
                <select defaultValue={f}>
                  <option>{f}</option>
                  <option>Do not import</option>
                </select>
                <CheckCircle2 size={16} />
              </div>
            ))}
          </div>
        )}
        {step === 2 && (
          <>
            <div className="review-numbers">
              <div>
                <CheckCircle2 size={23} />
                <span>
                  <b>2,421</b>Ready to import
                </span>
              </div>
              <div>
                <Clock3 size={23} />
                <span>
                  <b>17</b>Require attention
                </span>
              </div>
            </div>
            <div className="review-callout">
              <ShieldCheck size={18} />
              <span>
                Duplicate member IDs and invalid phone numbers will be skipped.
                You can download the error report after import.
              </span>
            </div>
          </>
        )}
        {step === 3 && (
          <div className="import-success">
            <div className="success-ring">
              <Check size={28} />
            </div>
            <div className="signup-title">2,421 members added</div>
            <p>
              Member records were added to Lagos Farmers Cooperative. Digital
              accounts were created without requiring login activation.
            </p>
            <div className="success-details">
              <span>2,421 imported</span>
              <span>17 skipped</span>
              <span>0 duplicates created</span>
            </div>
          </div>
        )}
      </div>
      <div className="wizard-footer">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
        >
          {step === 0 ? "Cancel" : "Back"}
        </Button>
        {step < 3 ? (
          <Button onClick={() => setStep(step + 1)}>
            {step === 2 ? "Import members" : "Continue"}{" "}
            <ArrowRight size={14} />
          </Button>
        ) : (
          <Button onClick={onComplete}>View members</Button>
        )}
      </div>
    </Modal>
  )
}

export function DependencyModal({
  moduleId,
  enabled,
  onClose,
  onConfirm,
}: {
  moduleId: string
  enabled: Set<string>
  onClose: () => void
  onConfirm: () => void
}) {
  const module = modules.find((m) => m.id === moduleId)!
  const missing = module.dependencies.filter(
    (dependency) => !enabled.has(dependency),
  )
  return (
    <Modal title="Enable required modules" onClose={onClose}>
      <div className="dependency-body">
        <div className="dependency-icon">
          <Network size={23} />
        </div>
        <div className="signup-title">
          {module.name} needs{" "}
          {missing
            .map((id) => modules.find((m) => m.id === id)?.name)
            .join(" and ")}
        </div>
        <p>
          These modules provide the member records and payment infrastructure
          needed for {module.name.toLowerCase()}.
        </p>
        <div className="dependency-list">
          {missing.map((id) => {
            const m = modules.find((x) => x.id === id)!
            const Icon = m.icon
            return (
              <div key={id}>
                <Icon size={17} />
                <div>
                  <b>{m.name}</b>
                  <span>{m.description}</span>
                </div>
                <Badge tone="blue">Required</Badge>
              </div>
            )
          })}
        </div>
      </div>
      <div className="wizard-footer">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={onConfirm}>Enable required modules</Button>
      </div>
    </Modal>
  )
}
