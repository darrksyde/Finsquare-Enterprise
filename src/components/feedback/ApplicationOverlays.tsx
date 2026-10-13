import { Network } from "@/icons"
import { Badge, Button, Modal } from "@/components/ui"
import { enterpriseModules as modules } from "@/app/config/module-registry"

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
