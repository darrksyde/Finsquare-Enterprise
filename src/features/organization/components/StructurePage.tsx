import { useMemo, useState } from "react"
import { Building2, ChevronRight, UserCog, Users, Zap } from "@/icons"
import { Button, IconButton, Badge, SectionHeader } from "@/components/ui"
import { EmptyState, LoadingState } from "@/components/feedback/AsyncState"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { useWorkspace } from "@/app/providers/WorkspaceProvider"
import { useBranches } from "@/features/branches/hooks/useBranches"
import { useGroups } from "@/features/groups/hooks/useGroups"
import { useMembers } from "@/features/members/hooks/useMembers"
import type { View } from "@/types"

/**
 * How the community is arranged: its branches, the groups inside them, and how its members reach
 * their account.
 *
 * Every count is read from the records themselves, so a community with nothing set up yet says so
 * rather than showing a structure belonging to somebody else.
 */
export function StructurePage({ navigate }: { navigate?: (view: View) => void }) {
  const organizationId = useOrganizationId()
  const { organization } = useWorkspace().state
  const { branches, status: branchStatus } = useBranches(organizationId)
  const { groups } = useGroups(organizationId)
  const { members } = useMembers(organizationId)
  const [branchId, setBranchId] = useState<string | null>(null)

  const effectiveBranchId = branchId ?? branches[0]?.id ?? null
  const selectedBranch = branches.find((branch) => branch.id === effectiveBranchId)

  const membersByBranch = useMemo(() => {
    const counts = new Map<string, number>()
    for (const member of members) {
      if (!member.branchId) continue
      counts.set(member.branchId, (counts.get(member.branchId) ?? 0) + 1)
    }
    return counts
  }, [members])

  const groupsInBranch = useMemo(
    () => groups.filter((group) => !effectiveBranchId || group.branchId === effectiveBranchId),
    [groups, effectiveBranchId],
  )

  const accountStatuses = useMemo(
    () => ({
      notCreated: members.filter((member) => member.accountStatus === "Not created").length,
      created: members.filter((member) => member.accountStatus === "Created").length,
      activated: members.filter((member) => member.accountStatus === "Activated").length,
    }),
    [members],
  )

  if (branchStatus === "loading") return <LoadingState label="Loading structure…" />

  return (
    <div className="page">
      <SectionHeader
        eyebrow="ORGANIZATION"
        title="Organization structure"
        description="Arrange members across branches and working groups."
        actions={
          <Button variant="secondary" onClick={() => navigate?.("groups")}>
            Manage groups
          </Button>
        }
      />
      <div className="hierarchy">
        <span>{organization.name || "This community"}</span>
        <ChevronRight size={14} />
        <span>
          {branches.length} {branches.length === 1 ? "branch" : "branches"}
        </span>
        <ChevronRight size={14} />
        <span>
          {groups.length} {groups.length === 1 ? "group" : "groups"}
        </span>
        <ChevronRight size={14} />
        <span>{members.length.toLocaleString()} members</span>
      </div>
      <div className="structure-grid">
        <section className="panel branch-list">
          <div className="panel-head">
            <div>
              <b>Branches</b>
              <span>Geographic structure</span>
            </div>
            <IconButton icon={ChevronRight} label="View branches" onClick={() => navigate?.("branches")} />
          </div>
          {branches.length === 0 ? (
            <EmptyState
              title="No branches yet"
              description="Branches are optional. Add one when members are organised by location."
            />
          ) : (
            branches.map((branch) => {
              const groupCount = groups.filter((group) => group.branchId === branch.id).length
              return (
                <button
                  type="button"
                  className={effectiveBranchId === branch.id ? "active" : ""}
                  onClick={() => setBranchId(branch.id)}
                  key={branch.id}
                >
                  <div className="branch-icon">
                    <Building2 size={16} />
                  </div>
                  <div>
                    <b>{branch.name}</b>
                    <span>
                      {membersByBranch.get(branch.id) ?? 0} members · {groupCount}{" "}
                      {groupCount === 1 ? "group" : "groups"}
                    </span>
                  </div>
                  <ChevronRight size={15} />
                </button>
              )
            })
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <div>
              <b>{selectedBranch ? `${selectedBranch.name} groups` : "Groups"}</b>
              <span>Members may belong to more than one group</span>
            </div>
            <Button variant="secondary" onClick={() => navigate?.("groups")}>
              Manage groups
            </Button>
          </div>
          {groupsInBranch.length === 0 ? (
            <EmptyState
              title="No groups here yet"
              description={
                effectiveBranchId
                  ? "This branch has no groups. Create one to organise its members."
                  : "Create a group to organise members around a purpose."
              }
            />
          ) : (
            <div className="group-list">
              {groupsInBranch.map((group, index) => (
                <div key={group.id}>
                  <div className={`group-color c${index % 4}`} />
                  <div>
                    <b>{group.name}</b>
                    <span>
                      {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                    </span>
                  </div>
                  <Badge tone={group.status === "active" ? "green" : "neutral"}>
                    {group.status === "active" ? "ACTIVE" : "ARCHIVED"}
                  </Badge>
                  <IconButton
                    icon={ChevronRight}
                    label={`Open ${group.name}`}
                    onClick={() => navigate?.("group-detail")}
                  />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <section className="panel member-access">
        <div className="panel-head">
          <div>
            <b>Member access</b>
            <span>How each member reaches their own account</span>
          </div>
        </div>
        {members.length === 0 ? (
          <EmptyState title="No members yet" description="Member access is counted once members exist." />
        ) : (
          <div className="access-cards">
            <div>
              <div className="access-card-icon">
                <UserCog size={18} />
              </div>
              <b>Admin managed</b>
              <p>Administrators keep the record and the member never signs in.</p>
              <Badge tone="blue">{accountStatuses.notCreated.toLocaleString()} members</Badge>
            </div>
            <div>
              <div className="access-card-icon">
                <Zap size={18} />
              </div>
              <b>Account created</b>
              <p>The member has an account that has not been activated yet.</p>
              <Badge tone="purple">{accountStatuses.created.toLocaleString()} members</Badge>
            </div>
            <div>
              <div className="access-card-icon">
                <Users size={18} />
              </div>
              <b>Self service</b>
              <p>The member signs in to manage their own activity.</p>
              <Badge tone="green">{accountStatuses.activated.toLocaleString()} members</Badge>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
