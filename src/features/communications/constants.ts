/**
 * The organization the frontend-only build runs against. A real deployment reads the
 * tenant from the authenticated session, never from a constant.
 */
export const COMMUNICATION_ORG_ID = "org-lagos-farmers"

/** Default price of one SMS part until the messaging provider is wired up. */
export const DEFAULT_SMS_RATE = 4
