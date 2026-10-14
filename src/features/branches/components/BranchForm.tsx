import { useState } from "react"
import { Button, Field, Modal, SelectField } from "@/components/ui"
import { branchSchema } from "../schemas/branch.schema"
import type { Branch, CreateBranchInput } from "@/types"
import { useAdministrators } from "@/features/administrators/hooks/useAdministrators"
import { useOrganizationId } from "@/hooks/useOrganizationId"

const emptyBranch: CreateBranchInput = {
  name: "",
  code: "",
  description: "",
  parentBranchId: null,
  status: "active",
  phone: "",
  email: "",
  address: {},
  administratorIds: [],
}

export function BranchForm({
  open,
  branch,
  branches,
  onClose,
  onSubmit,
}: {
  open: boolean
  branch?: Branch | null
  branches: Branch[]
  onClose: () => void
  onSubmit: (input: CreateBranchInput) => Promise<void>
}) {
  const [values, setValues] = useState<CreateBranchInput>(() =>
    branch
      ? {
          name: branch.name,
          code: branch.code,
          description: branch.description,
          parentBranchId: branch.parentBranchId,
          status: branch.status,
          phone: branch.phone,
          email: branch.email,
          address: branch.address,
        }
      : emptyBranch,
  )
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const organizationId = useOrganizationId()
  // The administrators a branch can be assigned to are the community's, so they come from the
  // service rather than from a seeded list.
  const { administrators } = useAdministrators(organizationId)
  if (!open) return null
  const parentName =
    branches.find((item) => item.id === values.parentBranchId)?.name ??
    "No parent branch"
  const administratorName =
    administrators.find((administrator) =>
      values.administratorIds?.includes(administrator.id),
    )?.name ?? "Not assigned"

  const submit = async () => {
    const parsed = branchSchema.safeParse(values)
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Review the branch details.")
      return
    }
    setSaving(true)
    try {
      await onSubmit(parsed.data)
      onClose()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Unable to save branch.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={branch ? "Edit branch" : "Create branch"}
      onClose={onClose}
      wide
    >
      <div className="wizard-body">
        <div className="form-section-title">Basic information</div>
        <div className="form-grid">
          <Field
            label="Branch name"
            value={values.name}
            onChange={(name) => setValues({ ...values, name })}
          />
          <Field
            label="Branch code"
            value={values.code}
            placeholder="e.g. LAG"
            onChange={(code) => setValues({ ...values, code })}
          />
          <SelectField
            label="Status"
            value={values.status}
            options={["active", "inactive"]}
            onChange={(status) =>
              setValues({
                ...values,
                status: status as CreateBranchInput["status"],
              })
            }
          />
          <SelectField
            label="Parent branch"
            value={parentName}
            options={[
              "No parent branch",
              ...branches
                .filter((item) => item.id !== branch?.id)
                .map((item) => item.name),
            ]}
            onChange={(name) =>
              setValues({
                ...values,
                parentBranchId:
                  branches.find((item) => item.name === name)?.id ?? null,
              })
            }
          />
          <label className="field span-2">
            <span>Description</span>
            <textarea
              value={values.description}
              onChange={(event) =>
                setValues({ ...values, description: event.target.value })
              }
            />
          </label>
        </div>
        <div className="form-section-title">Contact information</div>
        <div className="form-grid">
          <Field
            label="Phone"
            value={values.phone}
            onChange={(phone) => setValues({ ...values, phone })}
          />
          <Field
            label="Email"
            value={values.email}
            onChange={(email) => setValues({ ...values, email })}
          />
          <Field
            label="Address"
            value={values.address?.line1}
            onChange={(line1) =>
              setValues({ ...values, address: { ...values.address, line1 } })
            }
          />
          <Field
            label="City / area"
            value={values.address?.city}
            onChange={(city) =>
              setValues({ ...values, address: { ...values.address, city } })
            }
          />
        </div>
        <div className="form-section-title">Administration</div>
        <div className="form-grid">
          <SelectField
            label="Branch administrator"
            value={administratorName}
            options={[
              "Not assigned",
              ...administrators.map((administrator) => administrator.name),
            ]}
            onChange={(name) =>
              setValues({
                ...values,
                administratorIds: administrators
                  .filter((administrator) => administrator.name === name)
                  .map((administrator) => administrator.id),
              })
            }
          />
        </div>
        {error && (
          <div className="form-error" role="alert">
            {error}
          </div>
        )}
      </div>
      <div className="wizard-footer">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={saving} onClick={submit}>
          {saving ? "Saving…" : branch ? "Save changes" : "Create branch"}
        </Button>
      </div>
    </Modal>
  )
}
