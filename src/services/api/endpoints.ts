export const endpoints = {
  auth: {
    login: "/auth/login",
    logout: "/auth/logout",
  },
  members: {
    list: (organizationId: string) =>
      `/organizations/${organizationId}/members`,
    detail: (organizationId: string, memberId: string) =>
      `/organizations/${organizationId}/members/${memberId}`,
    import: (organizationId: string) =>
      `/organizations/${organizationId}/members/import`,
  },
  groups: {
    list: (organizationId: string) => `/organizations/${organizationId}/groups`,
    detail: (organizationId: string, groupId: string) =>
      `/organizations/${organizationId}/groups/${groupId}`,
    members: (organizationId: string, groupId: string) =>
      `/organizations/${organizationId}/groups/${groupId}/members`,
  },
  branches: {
    list: (organizationId: string) =>
      `/organizations/${organizationId}/branches`,
    detail: (organizationId: string, branchId: string) =>
      `/organizations/${organizationId}/branches/${branchId}`,
  },
  administrators: {
    list: (organizationId: string) =>
      `/organizations/${organizationId}/administrators`,
    detail: (organizationId: string, administratorId: string) =>
      `/organizations/${organizationId}/administrators/${administratorId}`,
    roles: (organizationId: string) => `/organizations/${organizationId}/roles`,
  },
  compliance: {
    case: (organizationId: string) =>
      `/organizations/${organizationId}/compliance`,
  },
  corporateAccount: {
    application: (organizationId: string) =>
      `/organizations/${organizationId}/corporate-account`,
  },
  contributions: {
    list: (organizationId: string) =>
      `/organizations/${organizationId}/contributions`,
    detail: (organizationId: string, contributionId: string) =>
      `/organizations/${organizationId}/contributions/${contributionId}`,
    participants: (organizationId: string, contributionId: string) =>
      `/organizations/${organizationId}/contributions/${contributionId}/participants`,
    transactions: (organizationId: string, contributionId: string) =>
      `/organizations/${organizationId}/contributions/${contributionId}/transactions`,
    withdrawals: (organizationId: string, contributionId: string) =>
      `/organizations/${organizationId}/contributions/${contributionId}/withdrawals`,
    /** Transactional batch used by the mock-shaped repository; production should expose named commands. */
    commands: (organizationId: string) =>
      `/organizations/${organizationId}/contributions/commands`,
    publicContribution: (slug: string) => `/public/contributions/${slug}`,
  },
  dues: {
    list: (organizationId: string) => `/organizations/${organizationId}/dues`,
    detail: (organizationId: string, duesPlanId: string) =>
      `/organizations/${organizationId}/dues/${duesPlanId}`,
    participants: (organizationId: string, duesPlanId: string) =>
      `/organizations/${organizationId}/dues/${duesPlanId}/participants`,
    charges: (organizationId: string, duesPlanId: string) =>
      `/organizations/${organizationId}/dues/${duesPlanId}/charges`,
    transactions: (organizationId: string, duesPlanId: string) =>
      `/organizations/${organizationId}/dues/${duesPlanId}/transactions`,
    /** Transactional batch used by the mock-shaped repository; production should expose named commands. */
    commands: (organizationId: string) =>
      `/organizations/${organizationId}/dues/commands`,
  },
  communications: {
    workspace: (organizationId: string) =>
      `/organizations/${organizationId}/communications`,
    /** Transactional batch used by the mock-shaped repository; production should expose named commands. */
    commands: (organizationId: string) =>
      `/organizations/${organizationId}/communications/commands`,
  },
  forms: {
    /** The shared question library: one library per organization, used by every form builder. */
    questionLibrary: (organizationId: string) =>
      `/organizations/${organizationId}/question-library`,
  },
  memberApplications: {
    workspace: (organizationId: string) =>
      `/organizations/${organizationId}/member-applications`,
    forms: (organizationId: string) =>
      `/organizations/${organizationId}/member-applications/forms`,
    applications: (organizationId: string) =>
      `/organizations/${organizationId}/member-applications/applications`,
    publicForm: (slug: string) => `/public/member-applications/${slug}`,
  },
} as const
