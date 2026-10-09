import { env } from "@/app/config/env"
import { ApiError, type RequestOptions } from "./types"

export interface ApiClient {
  get<T>(path: string, options?: RequestOptions): Promise<T>
  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T>
  delete<T>(path: string, options?: RequestOptions): Promise<T>
}

type AccessTokenProvider = () => string | null | Promise<string | null>
let accessTokenProvider: AccessTokenProvider = () => null

export function configureApiAuth(provider: AccessTokenProvider) {
  accessTokenProvider = provider
}

function normalizeStatus(status: number): ApiError["code"] {
  if (status === 401) return "unauthorized"
  if (status === 403) return "forbidden"
  if (status === 404) return "not_found"
  if (status === 422) return "validation"
  if (status >= 500) return "server"
  return "unknown"
}

async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 15_000,
  )

  try {
    const accessToken = await accessTokenProvider()
    const response = await fetch(`${env.VITE_API_URL}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...options.headers,
      },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    })

    const payload = response.status === 204 ? undefined : await response.json()
    if (!response.ok) {
      throw new ApiError(
        typeof payload?.message === "string"
          ? payload.message
          : "The request could not be completed.",
        normalizeStatus(response.status),
        response.status,
        payload,
      )
    }
    return payload as T
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "The request took too long. Please try again.",
        "timeout",
      )
    }
    throw new ApiError(
      "Unable to reach FinSquare. Check your connection and try again.",
      "network",
    )
  } finally {
    window.clearTimeout(timeout)
  }
}

export const apiClient: ApiClient = {
  get: (path, options) => request(path, { ...options, method: "GET" }),
  post: (path, body, options) =>
    request(path, { ...options, method: "POST", body }),
  patch: (path, body, options) =>
    request(path, { ...options, method: "PATCH", body }),
  delete: (path, options) => request(path, { ...options, method: "DELETE" }),
}
