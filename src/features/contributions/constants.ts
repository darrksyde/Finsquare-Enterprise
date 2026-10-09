/**
 * Tenant context for the contributions domain.
 *
 * Every repository method takes an `organizationId`; pages pass this constant the same way
 * the members, groups and branches screens do. When authentication lands, this is replaced by
 * the organization from the session — never by client input.
 */
export const CONTRIBUTION_ORG_ID = "org-lagos-farmers"
