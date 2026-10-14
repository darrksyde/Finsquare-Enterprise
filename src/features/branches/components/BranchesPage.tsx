import { useMemo, useState } from "react"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { GitBranch, MoreHorizontal, Plus } from "@/icons"
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
import { Button, IconButton, SectionHeader } from "@/components/ui"
import type { Branch, CreateBranchInput } from "@/types"
import { useBranches } from "../hooks/useBranches"
import { BranchForm } from "./BranchForm"
import { BranchStatusBadge } from "./BranchStatusBadge"

const pageSize = 6

function BranchTree({
  branches,
  parentId = null,
  onView,
}: {
  branches: Branch[]
  parentId?: string | null
  onView: (id: string) => void
}) {
  const children = branches.filter(
    (branch) => (branch.parentBranchId ?? null) === parentId,
  )
  if (!children.length) return null
  return (
    <div className={parentId ? "branch-tree-children" : "branch-tree"}>
      {children.map((branch) => (
        <div key={branch.id}>
          <button
            type="button"
            className="branch-tree-node"
            onClick={() => onView(branch.id)}
          >
            <GitBranch size={16} />
            <span>
              <b>{branch.name}</b>
              <small>
                {branch.code} · {branch.memberCount} members
              </small>
            </span>
            <BranchStatusBadge status={branch.status} />
          </button>
          <BranchTree
            branches={branches}
            parentId={branch.id}
            onView={onView}
          />
        </div>
      ))}
    </div>
  )
}

export function BranchesPage({
  onViewBranch,
  notify,
}: {
  onViewBranch: (id: string) => void
  notify: (message: string) => void
}) {
  const organizationId = useOrganizationId()
  const {
    branches,
    status,
    error,
    retry,
    createBranch,
    archiveBranch,
    activateBranch,
  } = useBranches(organizationId)
  const { can, canAccessBranch } = useAuthorization()
  const [viewMode, setViewMode] = useState<"list" | "hierarchy">("list")
  const [search, setSearch] = useState("")
  const [parent, setParent] = useState("All parents")
  const [branchStatus, setBranchStatus] = useState("All statuses")
  const [page, setPage] = useState(1)
  const [formOpen, setFormOpen] = useState(false)
  const [selected, setSelected] = useState(new Set<string>())
  const [confirmArchive, setConfirmArchive] = useState<string[] | null>(null)

  const filtered = useMemo(() => {
    const query = search.toLowerCase()
    return branches.filter((branch) => {
      if (!canAccessBranch(branch.id)) return false
      const parentName = branches.find(
        (item) => item.id === branch.parentBranchId,
      )?.name
      return (
        (!query ||
          [branch.name, branch.code, parentName].some((value) =>
            value?.toLowerCase().includes(query),
          )) &&
        (parent === "All parents" ||
          parentName === parent ||
          (parent === "No parent" && !branch.parentBranchId)) &&
        (branchStatus === "All statuses" || branch.status === branchStatus)
      )
    })
  }, [branchStatus, branches, canAccessBranch, parent, search])
  const rows = filtered.slice((page - 1) * pageSize, page * pageSize)

  const columns: DataTableColumn<Branch>[] = [
    {
      id: "branch",
      header: "Branch",
      render: (branch) => (
        <div className="entity-cell">
          <div className="entity-avatar">{branch.code ?? "BR"}</div>
          <div>
            <b>{branch.name}</b>
            <span>{branch.code}</span>
          </div>
        </div>
      ),
    },
    {
      id: "parent",
      header: "Parent",
      render: (branch) =>
        branches.find((item) => item.id === branch.parentBranchId)?.name ??
        "Organization",
    },
    {
      id: "members",
      header: "Members",
      render: (branch) => branch.memberCount,
    },
    { id: "groups", header: "Groups", render: (branch) => branch.groupCount },
    {
      id: "admins",
      header: "Administrators",
      render: (branch) => branch.administratorCount,
    },
    {
      id: "status",
      header: "Status",
      render: (branch) => <BranchStatusBadge status={branch.status} />,
    },
    {
      id: "created",
      header: "Created",
      render: (branch) => new Date(branch.createdAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "",
      render: (branch) => (
        <div onClick={(event) => event.stopPropagation()}>
          <IconButton
            icon={MoreHorizontal}
            label={`Actions for ${branch.name}`}
            onClick={() =>
              branch.status === "archived"
                ? void activateBranch(branch.id).then(() =>
                    notify("Branch reactivated"),
                  )
                : setConfirmArchive([branch.id])
            }
          />
        </div>
      ),
    },
  ]

  if (status === "loading") return <LoadingState label="Loading branches…" />
  if (status === "error")
    return (
      <ErrorState
        message={error ?? "Branches could not be loaded."}
        retry={retry}
      />
    )

  return (
    <div className="page">
      <SectionHeader
        eyebrow="ORGANIZATION"
        title="Branches"
        description="Manage the organization’s structural hierarchy and branch-level access."
        actions={
          <>
            <div className="view-switcher">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                onClick={() => setViewMode("list")}
              >
                List
              </Button>
              <Button
                variant={viewMode === "hierarchy" ? "secondary" : "ghost"}
                onClick={() => setViewMode("hierarchy")}
              >
                Hierarchy
              </Button>
            </div>
            {can("branches.create") && (
              <Button icon={Plus} onClick={() => setFormOpen(true)}>
                Create branch
              </Button>
            )}
          </>
        }
      />
      <div className="management-summary">
        <SummaryMetric label="Total branches" value={branches.length} />
        <SummaryMetric
          label="Active branches"
          value={branches.filter((branch) => branch.status === "active").length}
        />
        <SummaryMetric
          label="Members across branches"
          value={branches
            .filter((branch) => !branch.parentBranchId)
            .reduce((sum, branch) => sum + branch.memberCount, 0)
            .toLocaleString()}
        />
        <SummaryMetric
          label="Without administrators"
          value={
            branches.filter((branch) => branch.administratorCount === 0).length
          }
        />
      </div>
      {viewMode === "hierarchy" ? (
        <section className="panel hierarchy-panel">
          <div className="panel-head">
            <div>
              <b>Branch hierarchy</b>
              <span>Parent and child structural relationships</span>
            </div>
          </div>
          <BranchTree branches={filtered} onView={onViewBranch} />
        </section>
      ) : (
        <div className="table-panel">
          <FilterBar>
            <SearchInput
              value={search}
              onChange={(value) => {
                setSearch(value)
                setPage(1)
              }}
              placeholder="Search branch name, code, or parent"
            />
            <div className="management-filters">
              <select
                value={parent}
                onChange={(event) => setParent(event.target.value)}
              >
                <option>All parents</option>
                <option>No parent</option>
                {branches
                  .filter((branch) => !branch.parentBranchId)
                  .map((branch) => (
                    <option key={branch.id}>{branch.name}</option>
                  ))}
              </select>
              <select
                value={branchStatus}
                onChange={(event) => setBranchStatus(event.target.value)}
              >
                <option>All statuses</option>
                <option>active</option>
                <option>inactive</option>
                <option>archived</option>
              </select>
            </div>
          </FilterBar>
          {selected.size > 0 && can("branches.update") && (
            <div className="bulk-bar">
              <span>{selected.size} selected</span>
              <Button
                variant="ghost"
                onClick={() =>
                  void Promise.all([...selected].map(activateBranch)).then(
                    () => {
                      setSelected(new Set())
                      notify("Branches activated")
                    },
                  )
                }
              >
                Activate
              </Button>
              <Button
                variant="secondary"
                onClick={() => setConfirmArchive([...selected])}
              >
                Archive
              </Button>
            </div>
          )}
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={(branch) => branch.id}
            onRowClick={(branch) => onViewBranch(branch.id)}
            page={page}
            pageSize={pageSize}
            total={filtered.length}
            onPageChange={setPage}
            selectedKeys={selected}
            onSelectionChange={setSelected}
            empty={
              <EmptyState
                title="No branches found"
                description="Create a branch or adjust the active filters."
                action={
                  can("branches.create") ? (
                    <Button onClick={() => setFormOpen(true)}>
                      Create branch
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </div>
      )}
      <BranchForm
        key={formOpen ? "open" : "closed"}
        open={formOpen}
        branches={branches}
        onClose={() => setFormOpen(false)}
        onSubmit={async (input: CreateBranchInput) => {
          await createBranch(input)
          notify("Branch created")
        }}
      />
      <ConfirmDialog
        open={confirmArchive !== null}
        title="Archive branch?"
        description="The branch remains available for historical reporting. Members and child records are not deleted."
        confirmLabel="Archive branch"
        destructive
        onClose={() => setConfirmArchive(null)}
        onConfirm={() => {
          void Promise.all((confirmArchive ?? []).map(archiveBranch)).then(
            () => {
              setConfirmArchive(null)
              setSelected(new Set())
              notify("Branch archived")
            },
          )
        }}
      />
    </div>
  )
}
