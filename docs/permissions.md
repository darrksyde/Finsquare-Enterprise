# Permissions

Permissions are granular strings: `<module>.<action>` (e.g. `members.view`, `loans.approve`, `wallet.transfer`, `settings.manage`). The catalog lives in `src/lib/permissions/permission-catalog.ts`.

- `permissionCatalog` — all groups; each group is keyed to a module and may be flagged `organizationOnly` (administrators, roles, settings & compliance).
- `scopedPermissionGroups(enabledModules: ReadonlySet<string>, scope)` — the groups a role can be granted. Disabled modules' permissions are hidden; branch/group-scoped roles cannot receive organization-only permissions. Module cards in Settings show "Unlocks permissions: …".
- `useAuthorization()` provides `can(permission)` used by pages and navigation.
- `src/lib/permissions/capabilities.ts` — `canPerform(...)` / `moneyMovementMode(environment)` for environment (demo/live) gating of financial actions.

## Wallet-level access
Effective wallet permission = role permission **AND** a per-wallet (or `"*"`) `WalletAccess` grant. Helpers: `canOnWallet`, `walletsWith`, `visibleWallets`. Managed in Wallet → Access & controls.

## Maker-checker
Loan disbursements may require approval by amount rule with separation of duties (the approver cannot be the initiator). Rules are managed under Wallet → Access & controls → Approval rules.

Contribution payouts use their own per-plan threshold instead of wallet rules (see `contributions.md`): at or below `payout.approvalThreshold` a withdrawal is released with `contributions.withdraw`, above it a different administrator with `contributions.approve_withdrawal` must approve. `canApproveWithdrawal` enforces separation of duties.

## Reminder
Frontend checks are UX only. The backend must re-check every request against the user's role, scope, organization and (for wallets) per-wallet grants.

## Communications
`communication.view` · `communication.send` · `communication.export`, plus `communication.manage_balance`
for topping up the SMS balance. The top-up group is **organization-only** because it spends
organization money from a wallet. `communication.manage_balance` does not replace the wallet's own
checks: the wallet must also permit the movement. See `communications.md`.

## Member applications
`members.view_applications` opens the applications inbox and a single application;
`members.review_applications` approves or rejects, which is what creates a member.
`members.manage_forms` builds, publishes and archives the application form and controls its link —
it is **organization-only**, because the form is organization configuration rather than day-to-day
member work. See `member-applications.md`.

## Dues
`dues.view` · `dues.create` · `dues.update` · `dues.close` · `dues.record_payment` · `dues.recover` ·
`dues.export`, plus organization-only `dues.manage_rules`, which sets a plan's wallet lien rules —
they decide when the organization takes money out of a member's wallet, so a branch- or group-scoped
role cannot set them. `dues.recover` gates the explicit **Recover now** action, not the automatic
collection that a wallet credit triggers. See `dues.md`.

**The role mocks decide what the signed-in administrator can do.** `administrators.mock.ts` holds
`allPermissions` (the super-admin, and `currentAdministratorMock`'s role) and each named role. A new
permission that is added to `permission-catalog.ts` but not to those lists grants nothing and renders
an empty page.
