# 011 — Member application forms reuse the shared form builder

**Status:** accepted

## Context

Organizations onboard members in volume and needed a publishable application form, a shareable link, joining rules, an approval queue and an export — the same shape of problem the loan application form already solved. The app had a complete form builder (steps, fields, documents, question library, versioning, preview, renderer) living at `features/loans/components/form-builder/`, and a **decorative placeholder** `/forms` page that pretended to be a member registration builder while doing nothing.

Three options:

1. Build a second builder inside `features/members`.
2. Have `features/members` import the builder out of `features/loans`.
3. Promote the product-agnostic parts into a shared feature that both use.

## Decision

**Option 3.** `src/features/forms/` now owns the form vocabulary, the generic helpers, the builder components, the renderer, the response display and the question library. Loans keeps only what is loan-specific (`domain/loan-forms.ts`, `LoanApplicationForm`, `FormResponse`).

`FormBuilder` and `FormRenderer` no longer take a `LoanProduct`. They take the shapes they actually read — `LoanFormConfig` and `FormSubject` — which `LoanProduct` and `Borrower` satisfy structurally, so the loan call sites pass their existing objects with no cast and no behaviour change.

The question library moved out of `LoanDataset` into its own repository and service. A "shared" builder with one library per feature would still have made the brief's *reuse questions from the existing library* untrue.

## Consequences

- One builder, one renderer, one question library. A fix or a new field type lands in both features at once.
- **The loan flow is now on a shared dependency.** Anything touching `features/forms/` must be checked against `/apply/:slug` and the loan-type wizard.
- Imports into `features/forms` use deep paths rather than a barrel: `features/loans/domain/loan-forms.ts` imports `features/forms/domain/forms.ts`, and a barrel would introduce a cycle through `LoanUi`.
- `LoanDataset` lost `questionLibrary` and `LoanRepository` lost `saveQuestion`.
- The member application form is a normal second consumer, not a special case: the same builder, the same library, a different set of system steps.
- The decorative `FormsPage` and the `forms` view were deleted. The `forms` **module** id stays, because `enabledModules` is persisted in `localStorage` and removing a module id changes saved state.
