import { useCallback, useEffect, useState } from "react"
import { getUserErrorMessage } from "@/lib/errors/get-user-message"
import { questionLibraryService, type NewQuestion } from "../services/question-library.service"
import type { QuestionLibraryApi } from "../components/QuestionLibrary"
import type { AsyncStatus } from "@/types"
import type { QuestionLibraryItem } from "../types/form.types"

/**
 * The shared question library, scoped to an organization. `api` is the shape the builder
 * components expect, so a page can hand it straight to `FormBuilder`.
 */
export function useQuestionLibrary(organizationId: string) {
  const [items, setItems] = useState<QuestionLibraryItem[]>([])
  const [status, setStatus] = useState<AsyncStatus>("loading")
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => questionLibraryService.subscribe(() => setVersion((v) => v + 1)), [])

  useEffect(() => {
    let active = true
    questionLibraryService
      .list(organizationId)
      .then((result) => {
        if (!active) return
        setItems(result)
        setStatus("success")
        setError(null)
      })
      .catch((reason: unknown) => {
        if (!active) return
        setError(getUserErrorMessage(reason))
        setStatus("error")
      })
    return () => {
      active = false
    }
  }, [organizationId, version])

  const retry = useCallback(() => setVersion((v) => v + 1), [])

  const api = useCallback(
    (canEdit: boolean, notify?: (message: string) => void): QuestionLibraryApi => ({
      items,
      canEdit,
      notify,
      save: (question) => questionLibraryService.save(organizationId, question),
      duplicate: (question) => questionLibraryService.duplicate(organizationId, question),
      archive: (question) => questionLibraryService.archive(organizationId, question),
    }),
    [items, organizationId],
  )

  return {
    items,
    status,
    error,
    retry,
    create: (draft: NewQuestion) => questionLibraryService.create(organizationId, draft),
    api,
  }
}
