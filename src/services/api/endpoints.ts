export const endpoints = {
  auth: {
    login: "/auth/login",
    changePassword: "/auth/change-password",
    // No logout endpoint exists on the MFI backend: the JWT is stateless, so sign-out is client-side only.
  },
  /** MFI portfolio statistics backing the overview dashboard. */
  dashboard: "/dashboard",
  /** The communities the authenticated staff belongs to; the tenant comes from the session. */
  organizations: {
    list: "/communities",
    create: "/organizations",
  },
  loans: {
    types: "/loans/types",
    type: (loanTypeId: string) => `/loans/types/${loanTypeId}`,
    typeForm: (loanTypeId: string) => `/loans/types/${loanTypeId}/form`,
    applications: "/loans",
    approve: (applicationId: string) => `/loans/${applicationId}/approve`,
    reject: (applicationId: string) => `/loans/${applicationId}/reject`,
    reapply: (applicationId: string) => `/loans/${applicationId}/reapply`,
    requestInfo: (applicationId: string) => `/loans/${applicationId}/request-info`,
    cancel: (applicationId: string) => `/loans/${applicationId}/cancel`,
    offer: (applicationId: string) => `/loans/${applicationId}/offer`,
    acceptOffer: (applicationId: string) => `/loans/${applicationId}/offer/accept`,
    create: "/loans",
    disburse: (applicationId: string) => `/loans/${applicationId}/disburse`,
    batchDisburse: "/loans/batch-disburse",
    verifyGuarantor: (applicationId: string, guarantorId: string) =>
      `/loans/${applicationId}/guarantors/${guarantorId}/verify`,
    activeLoans: "/active-loans",
    repayments: "/repayments",
    repay: (loanId: string) => `/active-loans/${loanId}/repay`,
    disbursementLogs: "/loans/disbursement-logs",
    enterpriseLoans: "/enterprise/loans",
    startRecovery: (loanId: string) => `/active-loans/${loanId}/recovery`,
    recoveryActions: (caseId: string) => `/loans/recovery/${caseId}/actions`,
    markDefaulted: (loanId: string) => `/active-loans/${loanId}/mark-defaulted`,
    writeOff: (loanId: string) => `/active-loans/${loanId}/write-off`,
    recoverySettings: "/loans/recovery/settings",
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
