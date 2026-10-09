import type { EntityId } from "./common"

export const ORGANIZATION_AUDIT_EVENTS = [
  "GROUP_CREATED",
  "GROUP_UPDATED",
  "GROUP_ARCHIVED",
  "GROUP_MEMBER_ADDED",
  "GROUP_MEMBER_REMOVED",
  "BRANCH_CREATED",
  "BRANCH_UPDATED",
  "BRANCH_ARCHIVED",
  "ADMIN_INVITED",
  "ADMIN_ROLE_CHANGED",
  "ADMIN_SUSPENDED",
  "ADMIN_REACTIVATED",
] as const

export type OrganizationAuditEventType = typeof ORGANIZATION_AUDIT_EVENTS[number]

export interface OrganizationAuditEvent {
  id: EntityId
  organizationId: EntityId
  actorId: EntityId
  type: OrganizationAuditEventType
  resourceId: EntityId
  resourceType: "group" | "branch" | "administrator"
  occurredAt: string
  metadata?: Record<string, unknown>
}
