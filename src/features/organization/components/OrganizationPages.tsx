import { permissionCatalog } from "@/lib/permissions/permission-catalog"
import { useState } from "react"
import {
  Blocks,
  Building2,
  ChevronRight,
  MoreHorizontal,
  Plus,
  Settings,
  UserCog,
  Users,
  Zap,
} from "@/icons"
import {
  Button,
  IconButton,
  Badge,
  Toggle,
  SectionHeader,
} from "@/components/ui"
import {
  MODULE_CATEGORIES,
  enterpriseModules as modules,
} from "@/app/config/module-registry"
import { branchesMock, groupsMock } from "../mocks/structure.mock"

export function StructurePage() {
  const [branch, setBranch] = useState("Ikeja")
  return (
    <div className="page">
      <SectionHeader
        eyebrow="ORGANIZATION"
        title="Organization structure"
        description="Arrange members across branches and multiple working groups."
        actions={<Button icon={Plus}>Create group</Button>}
      />
      <div className="hierarchy">
        <span>Lagos Farmers Cooperative</span>
        <ChevronRight size={14} />
        <span>4 branches</span>
        <ChevronRight size={14} />
        <span>24 groups</span>
        <ChevronRight size={14} />
        <span>2,438 members</span>
      </div>
      <div className="structure-grid">
        <section className="panel branch-list">
          <div className="panel-head">
            <div>
              <b>Branches</b>
              <span>Geographic structure</span>
            </div>
            <IconButton icon={Plus} label="Add branch" />
          </div>
          {branchesMock.map((branchItem) => (
            <button
              type="button"
              className={branch === branchItem.name ? "active" : ""}
              onClick={() => setBranch(branchItem.name)}
              key={branchItem.id}
            >
              <div className="branch-icon">
                <Building2 size={16} />
              </div>
              <div>
                <b>{branchItem.name}</b>
                <span>
                  {branchItem.memberCount} members · {branchItem.groupCount}{" "}
                  groups
                </span>
              </div>
              <ChevronRight size={15} />
            </button>
          ))}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <b>{branch} groups</b>
              <span>Members may belong to more than one group</span>
            </div>
            <Button variant="secondary" icon={Plus}>
              New group
            </Button>
          </div>
          <div className="group-list">
            {groupsMock.map((group, index) => (
              <div key={group.id}>
                <div className={`group-color c${index}`} />
                <div>
                  <b>{group.name}</b>
                  <span>{group.memberCount} members</span>
                </div>
                <div className="avatar-stack">
                  <span>AJ</span>
                  <span>FB</span>
                  <span>+{index + 8}</span>
                </div>
                <IconButton icon={MoreHorizontal} label="Group actions" />
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="panel member-access">
        <div className="panel-head">
          <div>
            <b>Member access</b>
            <span>Choose the right interaction model for every member</span>
          </div>
        </div>
        <div className="access-cards">
          <div>
            <div className="access-card-icon">
              <UserCog size={18} />
            </div>
            <b>Admin managed</b>
            <p>
              Member never logs in. Administrators manage their account and
              records.
            </p>
            <Badge tone="blue">1,406 members</Badge>
          </div>
          <div>
            <div className="access-card-icon">
              <Zap size={18} />
            </div>
            <b>Assisted</b>
            <p>
              Member receives secure links to pay, register or approve requests.
            </p>
            <Badge tone="purple">746 members</Badge>
          </div>
          <div>
            <div className="access-card-icon">
              <Users size={18} />
            </div>
            <b>Self service</b>
            <p>Member activates FinSquare to manage their own activity.</p>
            <Badge tone="green">286 members</Badge>
          </div>
        </div>
      </section>
    </div>
  )
}

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
