/**
 * The tenant the seeded mock datasets belong to.
 *
 * The frontend-only build ships one community with records in it; every other community — the second
 * one an administrator belongs to, and every one they create — genuinely has none. Mock stores are
 * keyed by `organizationId` and seeded for this tenant only, which is what makes switching visible
 * and keeps one community from seeing another's rows.
 *
 * A real backend never sees this constant: it takes the tenant from the authenticated session, and
 * mocks stop being the source of data at that point.
 */
export const SEED_ORGANIZATION_ID = "org-lagos-farmers"

export function isSeedTenant(organizationId: string): boolean {
  return organizationId === SEED_ORGANIZATION_ID
}
