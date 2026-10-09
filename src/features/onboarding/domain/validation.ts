import { z } from "zod"

const phone = z.string().trim().regex(/^\+?\d{10,15}$/, "Enter a valid phone number")
const email = z.string().trim().email("Enter a valid email address")
const required = (label: string) => z.string().trim().min(2, `${label} is required`)

export const accountSchema = z.object({
  name: required("Your full name"),
  email,
  phone,
  password: z.string().min(8, "Use at least 8 characters"),
})

export const organizationSchema = z.object({
  name: required("Organization name"),
  type: required("Organization type"),
})

export const organizationInfoSchema = z.object({
  legalName: required("Registered name"),
  email,
  phone,
  country: required("Country"),
  state: required("State"),
  city: required("City"),
  address: required("Physical address"),
  website: z.string().trim().refine((v) => !v || /^(https?:\/\/)?[\w-]+(\.[\w-]+)+\S*$/.test(v), "Enter a valid website"),
  yearEstablished: z.string().trim().refine((v) => !v || (/^\d{4}$/.test(v) && Number(v) >= 1800 && Number(v) <= new Date().getFullYear()), "Enter a valid year"),
  memberCount: z.string().trim().refine((v) => !v || /^\d+$/.test(v), "Enter a whole number"),
})

export const corporateSchema = z.object({
  businessName: required("Business name"),
  registrationNumber: required("Registration number"),
  businessAddress: required("Business address"),
  accountHolder: required("Account holder"),
  repName: required("Representative name"),
  repRole: required("Representative role"),
  repPhone: phone,
  repEmail: email,
  repIdNumber: required("ID number"),
  accountNumber: z.string().regex(/^\d{10}$/, "Account number must be 10 digits"),
  accountName: required("Account name"),
})

export type FieldErrors = Record<string, string>

export function validate<T extends z.ZodTypeAny>(schema: T, value: unknown): FieldErrors {
  const result = schema.safeParse(value)
  if (result.success) return {}
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) errors[String(issue.path[0])] ??= issue.message
  return errors
}
