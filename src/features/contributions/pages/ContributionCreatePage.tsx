import { ShellPage } from "@/components/layout/ShellPage"
import { ContributionPage } from "../components/ContributionUi"
import { CreateContributionForm } from "../components/CreateContributionForm"
import type { ContributionPageProps } from "../components/ContributionUi"

export default function ContributionCreatePage(props: ContributionPageProps) {
  return (
    <ContributionPage {...props}>
      {(ctx) => (
        <ShellPage
          level="detail"
          width="narrow"
          title="Create contribution"
          description="Set up a collection plan. Everything stays editable afterwards."
        >
          <CreateContributionForm ctx={ctx} />
        </ShellPage>
      )}
    </ContributionPage>
  )
}
