import { ApiError } from "@/services/api"

export function getUserErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error && error.message) return error.message
  return "Something went wrong. Please try again."
}
