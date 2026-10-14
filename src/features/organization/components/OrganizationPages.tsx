import { permissionCatalog } from "@/lib/permissions/permission-catalog"
import { Blocks, Settings } from "@/icons"
import { Badge, IconButton, Toggle, SectionHeader } from "@/components/ui"
import {
  MODULE_CATEGORIES,
  enterpriseModules as modules,
} from "@/app/config/module-registry"

export function ModulesPage({
  enabled,
  toggle,
}: {
  enabled: Set<string>
  toggle: (id: string) => void
}) {
  return (
    <div className="page">
      <SectionHeader
        eyebrow="WORKSPACE SETTINGS"
        title="Modules"
        description="Choose the tools your organization needs. Navigation updates automatically."
        actions={<Badge tone="blue">{enabled.size} enabled</Badge>}
      />
      <div className="module-intro">
        <Blocks size={20} />
        <div>
          <b>One platform, configured around your organization</b>
          <span>
            Enable only the operational tools you need. Dependencies stay
            connected automatically.
          </span>
        </div>
      </div>
      {MODULE_CATEGORIES.map((group) => (
        <section className="module-section" key={group}>
          <div className="module-group-title">
            {group}
            <span>
              {modules.filter((m) => m.group === group).length} modules
            </span>
          </div>
          <div className="module-grid">
            {modules
              .filter((m) => m.group === group)
              .map((module) => {
                const Icon = module.icon
                const on = enabled.has(module.id)
                return (
                  <div
                    className={`module-card ${on ? "enabled" : ""}`}
                    key={module.id}
                  >
                    <div className="module-icon">
                      <Icon size={18} />
                    </div>
                    <div className="module-info">
                      <div>
                        <b>{module.name}</b>
                        {on && <Badge tone="green">Enabled</Badge>}
                      </div>
                      <p>{module.description}</p>
                      {permissionCatalog.some((g) => g.module === module.id) && (
                        <small>
                          Unlocks permissions:{" "}
                          {permissionCatalog.filter((g) => g.module === module.id).map((g) => g.label).join(", ")}
                        </small>
                      )}
                      {module.dependencies.length > 0 && (
                        <small>
                          Requires{" "}
                          {module.dependencies
                            .map((r) => modules.find((m) => m.id === r)?.name)
                            .join(" + ")}
                        </small>
                      )}
                    </div>
                    <div className="module-actions">
                      <IconButton
                        icon={Settings}
                        label={`${module.name} settings`}
                      />
                      <Toggle value={on} onChange={() => toggle(module.id)} />
                    </div>
                  </div>
                )
              })}
          </div>
        </section>
      ))}
    </div>
  )
}
