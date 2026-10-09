import type { Organization } from "@/types"

export const organizationMock: Organization = {
  id: "org-lagos-farmers",
  name: "Lagos Farmers Cooperative",
  type: "Cooperative",
  country: "Nigeria",
  email: "admin@lagosfarmers.com",
  phone: "+234 800 000 0148",
  address: "14 Cooperative Way, Ikeja, Lagos",
  website: "lagosfarmers.com",
  environment: "live",
  enabledModules: [
    "members",
    "groups",
    "branches",
    "contributions",
    "dues",
    "payments",
    "loans",
    "communication",
    "reports",
  ],
  branding: {
    primaryColor: "blue",
    colorMode: "light",
  },
}
