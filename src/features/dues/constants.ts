/**
 * Tenant context for the dues domain.
 *
 * Every repository method takes an `organizationId`; pages pass this constant the same way the
 * members, groups, branches and contributions screens do. When authentication lands, this is
 * replaced by the organization from the session — never by client input.
 */
export const DUES_ORG_ID = "org-lagos-farmers"
