export type ApiErrorCode = "network" | "timeout" | "unauthorized" | "forbidden" | "not_found" | "validation" | "server" | "unknown"

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: ApiErrorCode,
    public readonly status?: number,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown
  timeoutMs?: number
}
