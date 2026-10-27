export const endpoints = {
  auth: {
    login: "/auth/login",
    changePassword: "/auth/change-password",
    register: "/self-register",
    // No logout endpoint exists on the MFI backend: the JWT is stateless, so sign-out is client-side only.
  },
  /** MFI portfolio statistics backing the overview dashboard. */
  dashboard: "/dashboard",
  /** The communities the authenticated staff belongs to; the tenant comes from the session. */
  organizations: {
    list: "/communities",
    create: "/communities",
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
    list: "/customers",
    all: "/enterprise/customers",
    detail: (memberId: string) => `/customers/${memberId}`,
    enrol: "/customers/enrol",
    import: "/customers/import",
  },
  groups: {
    list: "/groups",
    types: "/groups/types",
    detail: (groupId: string) => `/groups/${groupId}`,
    members: (groupId: string) => `/groups/${groupId}/members`,
    member: (groupId: string, memberId: string) =>
      `/groups/${groupId}/members/${memberId}`,
    archive: (groupId: string) => `/groups/${groupId}/archive`,
    activate: (groupId: string) => `/groups/${groupId}/activate`,
  },
  branches: {
    list: "/branches",
    detail: (branchId: string) => `/branches/${branchId}`,
    members: (branchId: string) => `/branches/${branchId}/members`,
    groups: (branchId: string) => `/branches/${branchId}/groups`,
    administrators: (branchId: string) =>
      `/branches/${branchId}/administrators`,
    archive: (branchId: string) => `/branches/${branchId}/archive`,
    activate: (branchId: string) => `/branches/${branchId}/activate`,
  },
  administrators: {
    list: "/staff",
    detail: (staffId: string) => `/staff/${staffId}`,
    invite: "/staff/invite",
    resendInvite: (staffId: string) => `/staff/${staffId}/resend-invite`,
    suspend: (staffId: string) => `/staff/${staffId}/suspend`,
    reactivate: (staffId: string) => `/staff/${staffId}/reactivate`,
    deactivate: (staffId: string) => `/staff/${staffId}/deactivate`,
    role: (staffId: string) => `/staff/${staffId}/role`,
  },
  compliance: {
    statuses: "/compliance",
  },
  corporateAccount: {
    account: "/corporate-account",
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
    workspace: "/enterprise/communications",
    commands: "/enterprise/communications",
  },
  forms: {
    /** The shared question library: one library per organization, used by every form builder. */
    questionLibrary: (organizationId: string) =>
      `/organizations/${organizationId}/question-library`,
  },
  memberApplications: {
    workspace: "/member-applications",
    forms: "/member-applications/forms",
    applications: "/member-applications/applications",
    publicForm: (slug: string) => `/public/member-applications/${slug}`,
    publicSubmit: (slug: string) => `/public/member-applications/${slug}/submit`,
  },
} as const
