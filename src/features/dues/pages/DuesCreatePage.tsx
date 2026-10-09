import { ShellPage } from "@/components/layout/ShellPage"
import { DuesPage } from "../components/DuesUi"
import { CreateDuesForm } from "../components/CreateDuesForm"
import type { DuesPageProps } from "../components/DuesUi"
export default function DuesCreatePage(props: DuesPageProps) {
  return (
    <DuesPage {...props}>
      {(ctx) => (
        <ShellPage
          level="detail"
          width="narrow"
          title="Create dues plan"
          description="A fixed amount, how often it is due, and who pays it."
        >
          <CreateDuesForm ctx={ctx} />
        </ShellPage>
      )}
    </DuesPage>
  )
}
