import { useMemo, useState } from "react"
import { useOrganizationId } from "@/hooks/useOrganizationId"
import { Plus, UserPlus } from "@/icons"
import { useBranches } from "@/features/branches/hooks/useBranches"
import { useMembers } from "@/features/members/hooks/useMembers"
import { useAuthorization } from "@/features/administrators/hooks/useAuthorization"
import { Button, SectionHeader, SelectField } from "@/components/ui"
import {
  AccessDeniedState,
  ErrorState,
  LoadingState,
} from "@/components/feedback/AsyncState"
import { useGroup, useGroups } from "../hooks/useGroups"
import { GroupStatusBadge } from "./GroupStatusBadge"
import { GroupForm } from "./GroupForm"
import type { CreateGroupInput, GroupMemberRole } from "@/types"

export function GroupDetailsPage({
  groupId,
  notify,
}: {
  groupId: string
  notify: (message: string) => void
}) {
  const organizationId = useOrganizationId()
  const {
    group,
    memberships,
    status,
    error,
    retry,
    addMember,
    removeMember,
    updateMemberRole,
    updateGroup,
  } = useGroup(organizationId, groupId)
  // Branches, members and group types belong to this community, not to a seeded list.
  const { groupTypes } = useGroups(organizationId)
  const { branches } = useBranches(organizationId)
  const { members } = useMembers(organizationId)
  const { can } = useAuthorization()
  const [tab, setTab] = useState("Overview")
  const [editOpen, setEditOpen] = useState(false)
  const [memberName, setMemberName] = useState("Select member")
  const availableMembers = useMemo(
    () =>
      members.filter(
        (member) =>
          !memberships.some((membership) => membership.memberId === member.id),
      ),
    [memberships],
  )

  if (status === "loading") return <LoadingState label="Loading group…" />
  if (status === "error" || !group)
    return <ErrorState message={error ?? "Group not found."} retry={retry} />
  if (!can("groups.view", group.branchId)) return <AccessDeniedState />

  const coordinator = members.find(
    (member) => member.id === group.coordinatorMemberId,
  )
  const branch = branches.find((item) => item.id === group.branchId)
  const type = groupTypes.find((item) => item.id === group.typeId)

  return (
    <div className="page">
      <SectionHeader
        eyebrow={group.code ?? "GROUP"}
        title={group.name}
        description={group.description}
        actions={
          <>
            <GroupStatusBadge status={group.status} />
            {can("groups.update", group.branchId) && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit group
              </Button>
            )}
            {can("groups.update", group.branchId) && (
              <Button
                variant="secondary"
                onClick={() =>
                  void updateGroup({
                    status: group.status === "active" ? "inactive" : "active",
                  }).then(() => notify("Group status updated"))
                }
              >
                {group.status === "active" ? "Deactivate" : "Activate"}
              </Button>
            )}
          </>
        }
      />
      <div className="tabs">
        {["Overview", "Members", "Activity"].map((item) => (
          <button
            type="button"
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "Overview" && (
        <div className="profile-grid">
          <section className="panel">
            <div className="panel-head">
              <div>
                <b>Group information</b>
                <span>Purpose and organization placement</span>
              </div>
            </div>
            <div className="detail-grid">
              <div>
                <span>Type</span>
                <b>{type?.name ?? "Other"}</b>
              </div>
              <div>
                <span>Branch</span>
                <b>{branch?.name ?? "Organization-wide"}</b>
              </div>
              <div>
                <span>Coordinator</span>
                <b>{coordinator?.name ?? "Not assigned"}</b>
              </div>
              <div>
                <span>Members</span>
                <b>{memberships.length}</b>
              </div>
              <div>
                <span>Visibility</span>
                <b>{group.visibility}</b>
              </div>
              <div>
                <span>Created</span>
                <b>{new Date(group.createdAt).toLocaleDateString()}</b>
              </div>
            </div>
          </section>
          <section className="panel">
            <div className="panel-head">
              <div>
                <b>Recent activity</b>
                <span>Administrative changes</span>
              </div>
            </div>
            <div className="activity-row">
              <div>
                <b>Group details reviewed</b>
                <span>Today · Admin User</span>
              </div>
            </div>
            <div className="activity-row">
              <div>
                <b>Membership updated</b>
                <span>2 days ago · Membership Officer</span>
              </div>
            </div>
          </section>
        </div>
      )}
      {tab === "Members" && (
        <section className="panel">
          <div className="panel-head">
            <div>
              <b>Group members</b>
              <span>Members may belong to multiple groups</span>
            </div>
            {can("groups.manage_members", group.branchId) &&
              availableMembers.length > 0 && (
                <div className="inline-add-control">
                  <SelectField
                    label="Add member"
                    value={memberName}
                    options={[
                      "Select member",
                      ...availableMembers.map((member) => member.name),
                    ]}
                    onChange={setMemberName}
                  />
                  <Button
                    icon={UserPlus}
                    disabled={memberName === "Select member"}
                    onClick={() => {
                      const member = availableMembers.find(
                        (item) => item.name === memberName,
                      )
                      if (!member) return
                      void addMember(member.id).then(() => {
                        setMemberName("Select member")
                        notify("Member added to group")
                      })
                    }}
                  >
                    Add
                  </Button>
                </div>
              )}
          </div>
          <div className="document-table">
            {memberships.map((membership) => {
              const member = members.find(
                (item) => item.id === membership.memberId,
              )
              return (
                <div className="document-row" key={membership.id}>
                  <div className="mini-avatar">{member?.initials ?? "M"}</div>
                  <div>
                    <b>{member?.name ?? membership.memberId}</b>
                    <span>{member?.phone}</span>
                  </div>
                  <select
                    value={membership.role}
                    disabled={!can("groups.manage_members", group.branchId)}
                    onChange={(event) =>
                      void updateMemberRole(
                        membership.memberId,
                        event.target.value as GroupMemberRole,
                      ).then(() => notify("Group role updated"))
                    }
                  >
                    <option value="member">Member</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="assistant_coordinator">
                      Assistant Coordinator
                    </option>
                    <option value="secretary">Secretary</option>
                    <option value="treasurer">Treasurer</option>
                  </select>
                  {can("groups.manage_members", group.branchId) && (
                    <Button
                      variant="ghost"
                      onClick={() =>
                        void removeMember(membership.memberId).then(() =>
                          notify("Member removed from group"),
                        )
                      }
                    >
                      Remove
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}
      {tab === "Activity" && (
        <div className="tab-empty">
          <Plus size={24} />
          <b>Group activity</b>
          <span>Group and membership changes will appear here.</span>
        </div>
      )}
      <GroupForm
        key={editOpen ? `edit-${group.updatedAt}` : "closed"}
        open={editOpen}
        group={group}
        groupTypes={groupTypes}
        branches={branches}
        members={members}
        onClose={() => setEditOpen(false)}
        onSubmit={async (input: CreateGroupInput) => {
          await updateGroup(input)
          notify("Group updated")
        }}
      />
    </div>
  )
}
