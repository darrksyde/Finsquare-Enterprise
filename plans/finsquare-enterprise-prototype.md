# FinSquare Enterprise Interactive Prototype — Implementation Plan

## 1. Goal and success criteria

Build a polished, desktop-first React prototype that demonstrates the complete FinSquare Enterprise journey in one continuous product experience:

1. Create an organization.
2. Enter a configurable workspace in Demo Mode immediately.
3. Digitize and manage members before verification.
4. Configure organization structure, modules, financial products, workflows, forms, roles, and permissions.
5. Complete simulated compliance and corporate-account setup in parallel.
6. Review go-live readiness, activate the organization, and continue in the same workspace in Live Mode.

The prototype is successful when the major journey steps are discoverable both through normal product navigation and through a compact Demo Journey control; all specified interactions work with local mock state; Demo Mode visibly permits configuration while disabling live money movement; and the Demo-to-Live transition changes capability/status rather than replacing the product shell.

## 2. Repository baseline and constraints

- Preserve the existing Vite entrypoint in `src/main.tsx`.
- Implement the product in the currently minimal `src/App.tsx` and global design tokens/utilities in `src/index.css`; introduce small local source modules only where needed to keep data and UI maintainable.
- Use React local state only; no backend or real financial integrations.
- Use Tailwind CSS v4 utilities and a small set of global CSS variables/animations.
- Keep the existing project font wiring and use a strong system sans stack (`Inter`-like where available) rather than introducing a private font.
- Use an established small icon library if added to the project (recommended: `lucide-react`) instead of hand-authored text symbols or emoji.
- Do not use photography; the supplied references inform interface density, spacing, navigation, thin-border treatment, and restrained accent usage rather than content imagery.

## 3. Visual system

### Product frame

- Neutral, near-white workspace with a fixed charcoal-on-white left rail, thin borders, and a compact top status bar.
- Desktop shell: approximately 232–248 px sidebar, flexible content canvas, optional 340–420 px right-side sheet.
- Mobile shell: sidebar becomes an overlay drawer; header gains a menu trigger; tables remain semantically intact inside horizontal scrollers; side sheets become full-screen panels.
- Maximum content widths vary by page: dashboard and dense tables use the full canvas; setup forms use a narrower centered width for focus.

### Design tokens

- Surfaces: white, soft cool gray page background, very light blue selected states.
- Text: charcoal primary, slate secondary, muted labels.
- Accent: restrained blue for primary actions, selected navigation, and progress.
- Status colors only: green for complete/live/approved, amber for warnings/pending, red for errors/required, purple or cyan only for module categorization when useful.
- Borders: 1 px neutral lines; radii mostly 6–10 px; minimal low-opacity shadow only on overlays.
- Typography: 12–14 px operating UI, 16–20 px section/page headings, compact labels and tabular numbers.
- Motion: 140–220 ms easing for drawers, modal opacity/scale, navigation state, toggles, progress, and toasts; respect `prefers-reduced-motion`.

### Reusable interaction patterns

Create a consistent set of internal primitives: buttons, icon buttons, inputs/selects, status badges, progress bars, modal, side sheet, toast, tabs, tooltip, empty state, compact table, stepper, toggle, and confirmation dialog. They remain visually consistent across every flow.

## 4. Application architecture and state model

### Navigation model

Use a single-page state-driven prototype rather than introducing URL routing for every subview. Maintain a typed `currentView` union for all pages and a separate overlay state for modal/sheet flows. Sidebar and Demo Journey both update `currentView`; close/back actions restore the relevant parent view.

Views:

- `create-organization`
- `overview`
- `members`, `member-profile`, `branches`, `groups`, `administrators`
- `modules`
- `contributions`, `dues`, `loans`
- `workflows`, `forms`
- `compliance`, `corporate-account`, `go-live`
- secondary shell destinations with compact representative screens where required by enabled modules

### Core local state

Keep a centralized state object in `App.tsx` (or a small `src/data.ts` plus hooks if the component becomes unwieldy):

- Organization details and whether creation is complete.
- Workspace mode: `demo | ready | live`.
- Current page, active overlay, toast queue, sidebar state, and Demo Journey menu state.
- Enabled module IDs and module dependency graph.
- Onboarding/checklist completion.
- Members list, selected member, profile account/login distinction, imported count, and import wizard state.
- Organization branches/groups and member memberships.
- Contribution, dues, and loan-product draft/published state.
- Workflow stages and form fields.
- Role/permission matrix edits.
- Compliance document statuses and readiness percentage.
- Corporate account setup step/status.
- Go-live prerequisites and activation confirmation.

Derive progress values and readiness from state rather than hardcoding independent percentages. Demo Journey jumps may seed a plausible state for that stage so every destination demonstrates its intended content without forcing the presenter to redo all previous steps.

### Mock data

Use fictional Lagos Farmers Cooperative data consistently:

- 2,438 members, 24 groups, 4 branches, 6 administrators.
- ₦18.4M contributions, ₦2.1M outstanding dues, ₦7.8M active loans.
- Named members including Adewale Johnson, Chinedu Okafor, Fatima Bello, Grace Williams, and Ibrahim Musa.
- Compact activity, attention, and approval rows with clearly fictional amounts and dates.

## 5. Detailed implementation scope

### A. Organization creation

- Full-page setup screen shown on first load, not a marketing page.
- Split, restrained composition: focused form plus a compact preview of what the workspace will include.
- Fields: name (prefilled to make demoing fast), organization type, country, email, phone, address, website, and logo upload simulation.
- Validate required fields inline; logo selection shows a local preview/initials fallback.
- “Create organization” animates into the persistent shell, sets the first two checklist items complete, and opens the onboarding readiness sheet.

### B. Persistent shell and dynamic sidebar

- FinSquare/ENTERPRISE wordmark, organization switcher, grouped navigation, Help, Notifications, and admin identity.
- Organization switcher opens a compact menu with the active organization plus “Create organization” and one illustrative alternate organization entry; switching can show a toast rather than maintaining a second full dataset.
- Sidebar items for optional modules are generated from enabled module state. Core members/organization/settings/compliance remain available.
- Top Demo Mode banner explains that setup/member onboarding is available while transactions remain locked; “Complete setup” opens readiness.
- In Live Mode, replace the demo banner with a smaller LIVE status strip while preserving layout.

### C. Overview dashboard and onboarding readiness

- Header with greeting, organization name, Demo/Live badge, and one contextual action.
- Six compact metric tiles in a dense responsive grid.
- “Needs attention” rendered as actionable rows, each navigating to the relevant setup area.
- Quick actions open actual flows or navigate to setup pages.
- Readiness side sheet shows the seven-item onboarding checklist, thin progress bar, individual navigation targets, and a “Continue setup” action to the next incomplete task.
- In Demo Mode, financial action buttons include a lock/test-mode treatment and tooltip; in Live Mode they become active.

### D. Members, import, add-member, and profile

- Members page with search, status/group filters, compact table, row hover/actions, Add member, and Import members.
- Prominent but subtle callout: every member can have a digital account without needing to sign in.
- Add-member side sheet with identity, contact, branch, and multi-group assignment; adding updates local rows and shows a toast.
- Four-step import sheet/modal:
  1. Simulated upload with `lagos-farmers-members.csv`, 2,438 detected records, and preview.
  2. Field mapping rows with select controls.
  3. Review showing 2,421 ready and 17 requiring attention.
  4. Progress/success state confirming members added and completing the onboarding item.
- Member rows open Adewale Johnson’s detailed profile with tabs, account/login states, branch/group details, financial summaries, documents/activity placeholders, and functional action menus.
- “Record payment” remains locked in Demo Mode but enabled after go-live; non-financial actions show contextual toasts or sheets.

### E. Organization structure and member access

- Branches page shows the hierarchy `Organization → Branches → Groups → Members` using a compact master/detail layout rather than large cards.
- Four branches and representative farmer groups; selecting a branch/group filters the adjacent member list.
- Multi-group membership appears as chips and can be edited from a member/group assignment sheet.
- Include a “Member access” section with three restrained cards/columns: Admin managed, Assisted secure links, and Self service.
- Show organization-specific custom-field presets for Farmers Association and Staff Association, with the active farmer fields displayed in the member schema editor.

### F. Module configuration and dependencies

- Modules settings page grouped into Core, Finance, Credit, Community, and Other using compact list/grid rows.
- Every module includes icon, description, state toggle, and settings action.
- Sidebar updates immediately when modules are enabled/disabled.
- Dependency graph:
  - Contributions → Members
  - Payments → Members
  - Savings → Members
  - Loans → Members + Payments
  - Repayments/Guarantors → Loans
- Enabling a module with unmet dependencies opens a dependency confirmation dialog; “Enable required modules” updates all required modules and shows a toast.
- Prevent disabling a required module while dependents remain enabled; explain and offer to disable dependents together.

### G. Contributions and dues configuration

- Contributions starts with an operational list that can demonstrate an empty state via “new scheme,” then opens a five-step side sheet:
  1. Basic information.
  2. Eligibility.
  3. Payment methods.
  4. Grace period/late-payment/reminder rules.
  5. Review.
- Defaults match Monthly Cooperative Contribution, ₦10,000 monthly, all active members.
- Creation yields a compact scheme dashboard with 2,438 eligible, 1,812 paid, 626 pending, and ₦18.12M collected.
- Dues page follows the same visual system with Annual Membership Dues, ₦25,000, annual frequency, eligibility, payment methods, and reminders, using a shorter configuration sheet to avoid duplicated ceremony.

### H. Loan products and approval workflows

- Loan Products list with draft/published state and “Create loan product.”
- Configuration sheet captures name, amount range, duration, interest, repayment, eligibility, maximum active loans, guarantor requirement, and approval rule.
- Review summary creates a Draft; Publish requires confirmation and updates status.
- Approval Workflows page includes tabs/picker for Loan approval and New member approval.
- Simple vertical stage builder with compact connected rows; add stage, rename stage inline, reorder up/down, and remove. Do not implement freeform BPMN drag canvases.
- Workflow changes update onboarding readiness and show saved-state feedback.

### I. Form builder and custom fields

- New Member Registration form builder with a two-pane desktop layout: sortable-style field list/editor on the left and responsive form preview on the right.
- Add field menu supports Text, Number, Dropdown, Date, Checkbox, and File upload.
- Each field supports label edit, required toggle, type change, reorder up/down, and delete.
- Preview Form toggles a modal/mobile-width preview; Publish Form updates status and toast.
- Custom-field presets demonstrate how the same platform supports farmer and staff-association schemas without product changes.

### J. Administrators, roles, and permissions

- Administrators page with six representative admins, role, setup state, and invitation action.
- Role selector for Super Admin, Finance Officer, Loan Officer, Membership Officer, and Auditor.
- Dense permission matrix with Members, Contributions, Loans, Reports, and Settings; cells cycle/select Full, View, or None.
- Role editing occurs in a side sheet and saves to local state; invite administrator is a compact modal that adds a pending row.

### K. Compliance center

- Header with In progress badge and progress derived from document/identity status.
- Summary rows for organization details, corporate documents, authorized representatives, identity verification, and additional requirements.
- Document table for organization registration, CAC documents, authorized representative ID, address verification, and board resolution.
- Each row exposes appropriate View, Upload, or Replace actions. Upload is simulated by a file input/progress transition and moves Required → Pending; a demo-only “Mark approved” action or Demo Journey stage can complete approvals so go-live is demonstrable.
- Explain clearly that verification is simulated and no real submission occurs.

### L. Corporate account setup

- Corporate Account page with Not connected, Under review, and Connected states.
- Four-step setup flow: confirm organization details, select authorized administrators, configure account type/currency/settlement preferences, and review.
- Submission changes status to Under review; a clearly labeled prototype control allows “Simulate approval” to move to Connected and update readiness.
- Copy avoids claiming a real bank account is being opened.

### M. Go-live readiness and transition

- Go Live page groups derived requirements under Organization, Workflows, Compliance, and Financial setup.
- Default state demonstrates 82% readiness with final compliance and account items incomplete.
- Disabled Go Live button has a visible reason plus accessible tooltip/click feedback.
- Once requirements are complete, show readiness summary: 2,438 members, 9 enabled modules, 6 administrators, Verified compliance, Connected account.
- Go Live opens a confirmation modal listing capabilities that will activate. “Activate organization” performs a restrained status transition, changes mode to Live, enables financial actions, shows success feedback, and returns to the same dashboard shell.

### N. Demo Journey control

- Fixed unobtrusive bottom-right control, visually secondary to product navigation.
- Opens a popover with all 15 numbered steps and completed/current states.
- Each jump routes to the relevant view or opens the appropriate flow:
  1. Create Organization
  2. Demo Mode
  3. Import Members
  4. Organization Structure
  5. Enable Modules
  6. Configure Contributions
  7. Configure Dues
  8. Configure Loans
  9. Build Workflows
  10. Create Forms
  11. Roles & Permissions
  12. Compliance
  13. Corporate Account
  14. Go Live
  15. Live Organization
- Jumping to late stages seeds only the minimum prerequisite demo state and can be reset through “Restart demo.”

## 6. Accessibility and responsive behavior

- Use semantic buttons, labels, tables, headings, and dialogs; visible focus rings and Escape/backdrop close behavior.
- Include `aria-label`, `aria-expanded`, and dialog attributes where appropriate.
- Never rely on color alone for state; pair colors with text/icons.
- Keep touch targets usable while maintaining visual density.
- At tablet/mobile sizes:
  - sidebar becomes a drawer;
  - top status banner stacks compactly;
  - dashboard metrics wrap from six to two/one columns;
  - forms and two-pane builders collapse to one column;
  - sheets become full-width;
  - table containers scroll horizontally with key identity columns remaining readable;
  - Demo Journey popover becomes a bottom sheet.

## 7. File-level implementation plan

Recommended organization, keeping scope compact:

- `src/App.tsx`: top-level state, view routing, overlays, and composition.
- `src/index.css`: Tailwind import first, then theme variables, base typography, focus/scrollbar treatment, restrained animation keyframes, and reduced-motion overrides.
- `src/data.ts`: module catalog/dependencies, nav metadata, demo members, branches/groups, admins, compliance documents, and journey steps.
- `src/components/ui.tsx`: reusable buttons, badges, progress, modal/sheet, tooltip, toggle, toast, tabs, table wrappers, and input primitives.
- `src/components/Shell.tsx`: sidebar, top mode banner, mobile navigation, organization switcher, and Demo Journey.
- `src/components/pages.tsx` or a small `src/pages/` group: dashboard and the major domain pages. Split only when component size warrants it; avoid needless architecture.
- `package.json`: add only the icon dependency if needed.

All components remain default exports where a file exposes a primary component, matching repository guidance.

## 8. Verification strategy

Primary verification is through the running Vite preview, as required for UI work.

### Functional walkthrough

1. Create the organization and verify transition into Demo Mode.
2. Open checklist and navigate each item.
3. Verify dynamic sidebar changes with module toggles and dependency dialogs.
4. Add/import members; open profile; confirm Account and Login remain distinct.
5. Create a contribution, dues configuration, and loan draft/publish flow.
6. Edit workflow stages and form fields; preview/publish a form.
7. Edit permissions and invite an admin.
8. Upload/approve simulated compliance docs and submit/simulate corporate account approval.
9. Confirm Go Live stays disabled until derived requirements are complete.
10. Activate the organization and verify Demo labels become Live while layout remains stable and payment actions unlock.
11. Use every Demo Journey step, including restart.
12. Check desktop and narrow viewport behavior in preview, including sidebar drawer, horizontal tables, and full-width sheets.

### Technical checks

- Because this is a broad implementation, run the repository-defined `npm run build` (or the repository’s active package-manager equivalent using the existing lockfile) once after the preview walkthrough to catch TypeScript/JSX issues.
- Run `npm run format -- --check` only if supported by the configured oxfmt script; otherwise run the repository’s exact formatting script only when it will not rewrite unrelated files.
- If preview exposes a concrete runtime failure, inspect targeted logs only then, fix the root cause, and repeat the affected walkthrough.

## 9. Explicit non-goals

- No real authentication, backend persistence, payment rails, bank-account creation, KYC provider, document processing, or API calls.
- No marketing landing page.
- No complex drag-and-drop/BPMN engine; reorder controls provide deterministic prototype interactions.
- No complete implementation of every secondary finance/community report page beyond the surfaces required to make navigation and module behavior credible.
- No heavy charting dependency; simple CSS/SVG sparklines or bars are sufficient for compact operational summaries.
