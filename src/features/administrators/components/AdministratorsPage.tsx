import { useMemo, useState } from "react"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { useBranches } from "@/features/branches/hooks/useBranches"
import { MoreHorizontal, Settings, UserPlus } from "@/icons"
import {
  DataTable,
  type DataTableColumn,
} from "@/components/data-display/DataTable"
import {
  FilterBar,
  SearchInput,
  SummaryMetric,
} from "@/components/data-display/ManagementPrimitives"
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/AsyncState"
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog"
import { Button, IconButton, SectionHeader } from "@/components/ui"
import type { Administrator, InviteAdministratorInput } from "@/types"
import { useAdministrators } from "../hooks/useAdministrators"
import { useAuthorization } from "../hooks/useAuthorization"
import { AdministratorStatusBadge } from "./AdministratorStatusBadge"
import { InviteAdministratorForm } from "./InviteAdministratorForm"

const pageSize = 6

export function AdministratorsPage({
  onViewAdministrator,
  onManageRoles,
  notify,
}: {
  onViewAdministrator: (id: string) => void
  onManageRoles: () => void
  notify: (message: string) => void
}) {
  const organizationId = useOrganizationId()
  const {
    administrators,
    roles,
    status,
    error,
    retry,
    invite,
    suspend,
    reactivate,
    resendInvitation,
  } = useAdministrators(organizationId)
  // Branch names and options belong to the community being managed, so they come from the service.
  const { branches } = useBranches(organizationId)
  const { can } = useAuthorization()
  const [search, setSearch] = useState("")
  const [role, setRole] = useState("All roles")
  const [branch, setBranch] = useState("All branches")
  const [administratorStatus, setAdministratorStatus] = useState("All statuses")
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [selected, setSelected] = useState(new Set<string>())
  const [confirmSuspend, setConfirmSuspend] = useState<string[] | null>(null)

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return administrators.filter((administrator) => {
      const roleNames = administrator.roleIds
        .map((roleId) => roles.find((item) => item.id === roleId)?.name)
        .filter(Boolean)
      const branchNames =
        administrator.accessScope.branchIds?.map(
          (branchId) => branches.find((item) => item.id === branchId)?.name,
        ) ?? []
      return (
        (!query ||
          [
            administrator.name,
            administrator.email,
            ...roleNames,
            ...branchNames,
          ]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(query))) &&
        (role === "All roles" || roleNames.includes(role)) &&
        (branch === "All branches" || branchNames.includes(branch)) &&
        (administratorStatus === "All statuses" ||
          administrator.status === administratorStatus)
      )
    })
  }, [administratorStatus, administrators, branch, role, roles, search])
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const columns: DataTableColumn<Administrator>[] = [
    {
      id: "administrator",
      header: "Administrator",
      render: (administrator) => (
        <div className="entity-cell">
          <div className="mini-avatar">
            {administrator.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <b>{administrator.name}</b>
            <span>{administrator.email}</span>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      render: (administrator) =>
        administrator.roleIds
          .map((roleId) => roles.find((item) => item.id === roleId)?.name)
          .filter(Boolean)
          .join(", "),
    },
    {
      id: "scope",
      header: "Scope",
      render: (administrator) =>
        administrator.accessScope.type === "organization"
          ? "Entire organization"
          : administrator.accessScope.branchIds
              ?.map(
                (branchId) =>
                  branches.find((item) => item.id === branchId)?.name,
              )
              .join(", "),
    },
    {
      id: "status",
      header: "Status",
      render: (administrator) => (
        <AdministratorStatusBadge status={administrator.status} />
      ),
    },
    {
      id: "lastActive",
      header: "Last active",
      render: (administrator) =>
        administrator.lastActiveAt
          ? new Date(administrator.lastActiveAt).toLocaleDateString()
          : "Never",
    },
    {
      id: "added",
      header: "Added",
      render: (administrator) =>
        new Date(administrator.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "",
      render: (administrator) => (
        <div onClick={(event) => event.stopPropagation()}>
          <IconButton
            icon={MoreHorizontal}
            label={`Actions for ${administrator.name}`}
            onClick={() => {
              if (administrator.status === "invited") {
                void resendInvitation(administrator.id).then(() =>
                  notify("Invitation resent"),
                )
              } else if (administrator.status === "suspended") {
                void reactivate(administrator.id).then(() =>
                  notify("Administrator reactivated"),
                )
              } else {
                setConfirmSuspend([administrator.id])
              }
            }}
          />
        </div>
      ),
    },
  ]

  if (status === "loading")
    return <LoadingState label="Loading administrators…" />
  if (status === "error")
    return (
      <ErrorState
        message={error ?? "Administrators could not be loaded."}
        retry={retry}
      />
    )

  return (
    <div className="page">
      <SectionHeader
        eyebrow="ACCESS CONTROL"
        title="Administrators"
        description="Manage workspace operators, roles, and organization or branch access."
        actions={
          <>
            {can("roles.view") && (
              <Button
                variant="secondary"
                icon={Settings}
                onClick={onManageRoles}
              >
                Roles & permissions
              </Button>
            )}
            {can("administrators.invite") && (
              <Button icon={UserPlus} onClick={() => setInviteOpen(true)}>
                Invite administrator
              </Button>
            )}
          </>
        }
      />
      <div className="management-summary">
        <SummaryMetric
          label="Total administrators"
          value={administrators.length}
        />
        <SummaryMetric
          label="Active"
          value={
            administrators.filter(
              (administrator) => administrator.status === "active",
            ).length
          }
        />
        <SummaryMetric
          label="Pending invitations"
          value={
            administrators.filter(
              (administrator) => administrator.status === "invited",
            ).length
          }
        />
        <SummaryMetric
          label="Suspended"
          value={
            administrators.filter(
              (administrator) => administrator.status === "suspended",
            ).length
          }
        />
      </div>
      <div className="table-panel">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={(value) => {
              setSearch(value)
              setPage(1)
            }}
            placeholder="Search administrator, email, role or branch"
          />
          <div className="management-filters">
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              <option>All roles</option>
              {roles.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
            <select
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
            >
              <option>All branches</option>
              {branches.map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
            <select
              value={administratorStatus}
              onChange={(event) => setAdministratorStatus(event.target.value)}
            >
              <option>All statuses</option>
              <option>active</option>
              <option>invited</option>
              <option>suspended</option>
              <option>deactivated</option>
            </select>
          </div>
        </FilterBar>
        {selected.size > 0 && (
          <div className="bulk-bar">
            <span>{selected.size} selected</span>
            {can("administrators.suspend") && (
              <Button
                variant="secondary"
                onClick={() => setConfirmSuspend([...selected])}
              >
                Suspend
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => {
                const invited = administrators.filter(
                  (administrator) =>
                    selected.has(administrator.id) &&
                    administrator.status === "invited",
                )
                void Promise.all(
                  invited.map((administrator) =>
                    resendInvitation(administrator.id),
                  ),
                ).then(() => notify("Pending invitations resent"))
              }}
            >
              Resend invitations
            </Button>
          </div>
        )}
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(administrator) => administrator.id}
          onRowClick={(administrator) => onViewAdministrator(administrator.id)}
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          empty={
            <EmptyState
              title="No administrators found"
              description="Invite an administrator or adjust the active filters."
              action={
                can("administrators.invite") ? (
                  <Button onClick={() => setInviteOpen(true)}>
                    Invite administrator
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </div>
      <InviteAdministratorForm
        key={inviteOpen ? "open" : "closed"}
        open={inviteOpen}
        roles={roles}
        onClose={() => setInviteOpen(false)}
        onSubmit={async (input: InviteAdministratorInput) => {
          await invite(input)
          notify("Administrator invitation sent")
        }}
      />
      <ConfirmDialog
        open={confirmSuspend !== null}
        title="Suspend administrator?"
        description="The administrator will lose workspace access. Historical actions remain attributed to them."
        confirmLabel="Suspend administrator"
        destructive
        onClose={() => setConfirmSuspend(null)}
        onConfirm={() => {
          if (!confirmSuspend) return
          void Promise.all(confirmSuspend.map(suspend)).then(() => {
            setConfirmSuspend(null)
            setSelected(new Set())
            notify("Administrator suspended")
          })
        }}
      />
    </div>
  )
}
