import { z } from "zod"

export const organizationSchema = z.object({
  name: z.string().trim().min(2, "Enter the organization name."),
  type: z.string().min(1, "Select an organization type."),
  country: z.string().min(1, "Select a country."),
  email: z.string().email("Enter a valid organization email."),
  phone: z.string().min(10, "Enter a valid phone number."),
  address: z.string().min(5, "Enter the organization address."),
  website: z.string().optional(),
})

export type OrganizationFormValues = z.infer<typeof organizationSchema>
