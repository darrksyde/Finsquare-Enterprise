export type EntityId = string

export interface AuditMetadata {
  actorId: EntityId
  organizationId: EntityId
  action: string
  resourceId: EntityId
  resourceType: string
  timestamp: string
  metadata?: Record<string, unknown>
}

export interface PaginatedResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export type AsyncStatus = "idle" | "loading" | "success" | "error"
