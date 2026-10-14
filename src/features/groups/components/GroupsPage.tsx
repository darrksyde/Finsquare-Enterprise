import { useMemo, useState } from "react"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { Folder, MoreHorizontal, Plus } from "@/icons"
import { useBranches } from "@/features/branches/hooks/useBranches"
import { useMembers } from "@/features/members/hooks/useMembers"
import { useGroups } from "../hooks/useGroups"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
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
import { Badge, Button, IconButton, SectionHeader } from "@/components/ui"
import type { CreateGroupInput, Group } from "@/types"
import { GroupForm } from "./GroupForm"
import { GroupStatusBadge } from "./GroupStatusBadge"

const pageSize = 5

export function GroupsPage({
  onViewGroup,
  notify,
}: {
  onViewGroup: (id: string) => void
  notify: (message: string) => void
}) {
  const organizationId = useOrganizationId()
  const {
    groups,
    groupTypes,
    status,
    error,
    retry,
    createGroup,
    archiveGroup,
    activateGroup,
  } = useGroups(organizationId)
  // Branches and members belong to the community being looked at, so they come from the service
  // rather than from a seeded list.
  const { branches } = useBranches(organizationId)
  const { members } = useMembers(organizationId)
  const { can, canAccessBranch } = useAuthorization()
  const [search, setSearch] = useState("")
  const [type, setType] = useState("All types")
  const [branch, setBranch] = useState("All branches")
  const [groupStatus, setGroupStatus] = useState("All statuses")
  const [sort, setSort] = useState("Name")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(new Set<string>())
  const [confirmArchive, setConfirmArchive] = useState<string[] | null>(null)

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    return groups
      .filter((group) => {
        if (group.branchId && !canAccessBranch(group.branchId)) return false
        const coordinator = members.find(
          (member) => member.id === group.coordinatorMemberId,
        )?.name
        const branchName = branches.find(
          (item) => item.id === group.branchId,
        )?.name
        return (
          (!query ||
            [group.name, group.code, coordinator, branchName].some((value) =>
              value?.toLowerCase().includes(query),
            )) &&
          (type === "All types" ||
            groupTypes.find((item) => item.id === group.typeId)?.name ===
              type) &&
          (branch === "All branches" || branchName === branch) &&
          (groupStatus === "All statuses" || group.status === groupStatus)
        )
      })
      .sort((left, right) =>
        sort === "Members"
          ? right.memberCount - left.memberCount
          : left.name.localeCompare(right.name),
      )
  }, [branch, canAccessBranch, groupStatus, groups, search, sort, type])

  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)
  const columns: DataTableColumn<Group>[] = [
    {
      id: "group",
      header: "Group",
      render: (group) => (
        <div className="entity-cell">
          <div className="entity-avatar">
            {group.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <b>{group.name}</b>
            <span>{group.code ?? "No code"}</span>
          </div>
        </div>
      ),
    },
    {
      id: "type",
      header: "Type",
      render: (group) =>
        groupTypes.find((item) => item.id === group.typeId)?.name ??
        "Other",
    },
    {
      id: "branch",
      header: "Branch",
      render: (group) =>
        branches.find((item) => item.id === group.branchId)?.name ??
        "Organization-wide",
    },
    { id: "members", header: "Members", render: (group) => group.memberCount },
    {
      id: "coordinator",
      header: "Coordinator",
      render: (group) =>
        members.find((member) => member.id === group.coordinatorMemberId)
          ?.name ?? <Badge tone="amber">Unassigned</Badge>,
    },
    {
      id: "status",
      header: "Status",
      render: (group) => <GroupStatusBadge status={group.status} />,
    },
    {
      id: "created",
      header: "Created",
      render: (group) => new Date(group.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "",
      render: (group) => (
        <div onClick={(event) => event.stopPropagation()}>
          <IconButton
            icon={MoreHorizontal}
            label={`Actions for ${group.name}`}
            onClick={() =>
              group.status === "archived"
                ? void activateGroup(group.id).then(() =>
                    notify("Group reactivated"),
                  )
                : setConfirmArchive([group.id])
            }
          />
        </div>
      ),
    },
  ]

  if (status === "loading") return <LoadingState label="Loading groups…" />
  if (status === "error")
    return (
      <ErrorState
        message={error ?? "Groups could not be loaded."}
        retry={retry}
      />
    )

  return (
    <div className="page">
      <SectionHeader
        eyebrow="ORGANIZATION"
        title="Groups"
        description="Organize members by purpose, committee, program, or shared activity."
        actions={
          can("groups.create") ? (
            <Button icon={Plus} onClick={() => setFormOpen(true)}>
              Create group
            </Button>
          ) : undefined
        }
      />
      <div className="management-summary">
        <SummaryMetric label="Total groups" value={groups.length} />
        <SummaryMetric
          label="Active groups"
          value={groups.filter((group) => group.status === "active").length}
        />
        <SummaryMetric
          label="Without coordinator"
          value={groups.filter((group) => !group.coordinatorMemberId).length}
        />
        <SummaryMetric
          label="Member assignments"
          value={groups
            .reduce((sum, group) => sum + group.memberCount, 0)
            .toLocaleString()}
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
            placeholder="Search groups, IDs, coordinators or branches"
          />
          <div className="management-filters">
            <select
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              <option>All types</option>
              {groupTypes.map((item) => (
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
              value={groupStatus}
              onChange={(event) => setGroupStatus(event.target.value)}
            >
              <option>All statuses</option>
              <option>active</option>
              <option>inactive</option>
              <option>archived</option>
            </select>
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option>Name</option>
              <option>Members</option>
            </select>
          </div>
        </FilterBar>
        {selected.size > 0 && can("groups.update") && (
          <div className="bulk-bar">
            <span>{selected.size} selected</span>
            <Button
              variant="ghost"
              onClick={() =>
                void Promise.all([...selected].map(activateGroup)).then(() => {
                  setSelected(new Set())
                  notify("Groups activated")
                })
              }
            >
              Activate
            </Button>
            <Button
              variant="secondary"
              icon={Folder}
              onClick={() => setConfirmArchive([...selected])}
            >
              Archive
            </Button>
          </div>
        )}
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(group) => group.id}
          onRowClick={(group) => onViewGroup(group.id)}
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          selectedKeys={selected}
          onSelectionChange={setSelected}
          empty={
            <EmptyState
              title="No groups found"
              description="Create your first group or adjust the active filters."
              action={
                can("groups.create") ? (
                  <Button onClick={() => setFormOpen(true)}>
                    Create group
                  </Button>
                ) : undefined
              }
            />
          }
        />
      </div>
      <GroupForm
        key={formOpen ? "open" : "closed"}
        open={formOpen}
        groupTypes={groupTypes}
        branches={branches}
        members={members}
        onClose={() => setFormOpen(false)}
        onSubmit={async (input: CreateGroupInput) => {
          await createGroup(input)
          notify("Group created")
        }}
      />
      <ConfirmDialog
        open={confirmArchive !== null}
        title="Archive group?"
        description="The group will remain available for historical records, but new activity will be disabled."
        confirmLabel="Archive group"
        destructive
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => {
          void Promise.all((confirmArchive ?? []).map(archiveGroup)).then(
            () => {
              setConfirmArchive(null)
              setSelected(new Set())
              notify("Group archived")
            },
          )
        }}
      />
    </div>
  )
}
