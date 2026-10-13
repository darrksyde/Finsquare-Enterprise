import type { z } from "zod"

export type FieldErrors = Record<string, string>

/** Flattens a zod result into `{ field: firstMessage }`, which is what inline field errors read. */
export function validate<T extends z.ZodTypeAny>(schema: T, value: unknown): FieldErrors {
  const result = schema.safeParse(value)
  if (result.success) return {}
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) errors[String(issue.path[0])] ??= issue.message
  return errors
}
