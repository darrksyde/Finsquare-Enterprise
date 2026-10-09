import { useState } from "react"
import {
  Check,
  ChevronRight,
  GitBranch,
  GripVertical,
  MoreHorizontal,
  Plus,
} from "@/icons"
import { Button, IconButton, Badge, SectionHeader } from "@/components/ui"

export function WorkflowsPage({ notify }: { notify: (s: string) => void }) {
  const [type, setType] = useState("Loan approval")
  const [stages, setStages] = useState([
    "Loan application",
    "Eligibility check",
    "Guarantor approval",
    "Loan Officer review",
    "Administrator approval",
    "Disbursement",
  ])
  const add = () =>
    setStages([
      ...stages.slice(0, -1),
      "New approval stage",
      stages[stages.length - 1],
    ])
  return (
    <div className="page">
      <SectionHeader
        eyebrow="AUTOMATION"
        title="Approval workflows"
        description="Design clear approval paths without complex process tooling."
        actions={
          <Button icon={Plus} onClick={add}>
            Add stage
          </Button>
        }
      />
      <div className="workflow-layout">
        <aside className="panel workflow-list">
          <div className="panel-head">
            <div>
              <b>Workflows</b>
              <span>2 configured</span>
            </div>
          </div>
          {["Loan approval", "New member approval"].map((w, i) => (
            <button
              type="button"
              className={type === w ? "active" : ""}
              onClick={() => {
                setType(w)
                setStages(
                  i === 0
                    ? [
                        "Loan application",
                        "Eligibility check",
                        "Guarantor approval",
                        "Loan Officer review",
                        "Administrator approval",
                        "Disbursement",
                      ]
                    : [
                        "Registration",
                        "Membership Officer",
                        "Administrator",
                        "Member activated",
                      ],
                )
              }}
              key={w}
            >
              <div className="workflow-list-icon">
                <GitBranch size={16} />
              </div>
              <div>
                <b>{w}</b>
                <span>
                  {i === 0 ? "6 stages · Published" : "4 stages · Published"}
                </span>
              </div>
              <ChevronRight size={15} />
            </button>
          ))}
        </aside>
        <section className="panel workflow-builder">
          <div className="panel-head">
            <div>
              <b>{type}</b>
              <span>Requests move through each stage in order</span>
            </div>
            <div className="saved">
              <Check size={13} />
              All changes saved
            </div>
          </div>
          <div className="stage-builder">
            {stages.map((stage, index) => (
              <div className="stage-row" key={`${stage}-${index}`}>
                <div className="stage-number">{index + 1}</div>
                <GripVertical size={16} />
                <div className="stage-copy">
                  <b>{stage}</b>
                  <span>
                    {index === 0
                      ? "Starts when a request is submitted"
                      : index === stages.length - 1
                        ? "Completes the workflow"
                        : "Approval required to continue"}
                  </span>
                </div>
                <Badge
                  tone={
                    index === 0 || index === stages.length - 1
                      ? "neutral"
                      : "blue"
                  }
                >
                  {index === 0
                    ? "TRIGGER"
                    : index === stages.length - 1
                      ? "OUTCOME"
                      : "APPROVAL"}
                </Badge>
                <IconButton icon={MoreHorizontal} label="Stage actions" />
              </div>
            ))}
          </div>
          <Button
            variant="secondary"
            icon={Plus}
            className="add-stage"
            onClick={add}
          >
            Add stage
          </Button>
          <div className="builder-footer">
            <Button
              variant="ghost"
              onClick={() => notify("Workflow duplicated")}
            >
              Duplicate
            </Button>
            <Button onClick={() => notify(`${type} workflow published`)}>
              Publish workflow
            </Button>
          </div>
        </section>
      </div>
    </div>
  )
}
