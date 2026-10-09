export const dashboardMetricsMock = [
  { id: "members", label: "Members", value: "2,438", detail: "+84 this month" },
  { id: "groups", label: "Groups", value: "24", detail: "Across 4 branches" },
  {
    id: "contributions",
    label: "Contributions",
    value: "₦18.4M",
    detail: "98.2% collected",
  },
  {
    id: "dues",
    label: "Outstanding dues",
    value: "₦2.1M",
    detail: "316 members",
  },
  {
    id: "loans",
    label: "Loan applications",
    value: "18",
    detail: "7 awaiting review",
  },
  {
    id: "approvals",
    label: "Pending approvals",
    value: "12",
    detail: "Across 3 workflows",
  },
] as const

export const attentionItemsMock = [
  {
    label: "42 new members awaiting approval",
    category: "Membership",
    target: "members",
  },
  {
    label: "8 contribution schemes need configuration",
    category: "Finance",
    target: "contributions",
  },
  {
    label: "3 administrators haven’t completed setup",
    category: "Access",
    target: "administrators",
  },
  {
    label: "Corporate account not connected",
    category: "Financial setup",
    target: "corporate",
  },
  {
    label: "4 compliance documents missing",
    category: "Compliance",
    target: "compliance",
  },
] as const
