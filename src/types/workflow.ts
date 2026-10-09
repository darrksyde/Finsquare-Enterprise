import type { EntityId } from "./common"

export interface WorkflowStage {
  id: EntityId
  name: string
  type: "trigger" | "approval" | "outcome"
  order: number
}

export interface ApprovalWorkflow {
  id: EntityId
  name: string
  status: "draft" | "published"
  stages: WorkflowStage[]
}

export interface FormFieldDefinition {
  id?: EntityId
  label: string
  type: "Text" | "Number" | "Dropdown" | "Date" | "Checkbox" | "File upload"
  required: boolean
  options?: string[]
}
