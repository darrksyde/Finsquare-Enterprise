import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  // Matches the backend's MFI login minimum (6 characters).
  password: z.string().min(6, "Use at least 6 characters"),
})

export type LoginInput = z.infer<typeof loginSchema>

/** The strength rule the backend enforces for new passwords (`ChangeMfiPasswordDto`). */
export const strongPasswordSchema = z
  .string()
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/,
    "Use 8+ characters with upper, lower, number and symbol",
  )

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: strongPasswordSchema,
    confirmPassword: z.string().min(1, "Confirm your new password"),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "New passwords do not match",
    path: ["confirmPassword"],
  })

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
