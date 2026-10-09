import { z } from "zod"

const envSchema = z.object({
  VITE_API_URL: z.string().url().default("http://localhost:3000"),
  VITE_APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
  VITE_ENABLE_MOCKS: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
})

const parsed = envSchema.safeParse(import.meta.env)

if (!parsed.success) {
  throw new Error(`Invalid application environment: ${parsed.error.message}`)
}

export const env = parsed.data
