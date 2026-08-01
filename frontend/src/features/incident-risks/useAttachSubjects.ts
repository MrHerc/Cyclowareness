/**
 * Attach named employees to an incident risk.
 *
 * `lib/api/mutations.ts` has no hook for `POST /{id}/subjects`, but the URL is
 * in the endpoint table and the screens cannot work without it: `POST /assign`
 * refuses with a 409 until somebody is attached, and `POST` on the risk itself
 * does not accept an employee list. Without this call the create form's people
 * picker would be a control that collects names and then drops them — which is
 * exactly the silent no-op the product forbids.
 *
 * So it is written here, against the same transport and the same endpoint table
 * every other mutation uses, and it invalidates the same caches the sibling
 * incident-risk mutations do. It belongs in `mutations.ts` the moment that file
 * is next opened.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api/client'
import { endpoints } from '../../lib/api/endpoints'
import { qk } from '../../lib/api/queries'
import type { IncidentRiskDetail } from '../../domain/types'

export interface AttachSubjectsInput {
  id: number | string
  employee_ids: number[]
  note?: string
}

export function useAttachSubjects() {
  const qc = useQueryClient()
  return useMutation<IncidentRiskDetail, ApiError, AttachSubjectsInput>({
    mutationFn: ({ id, ...body }) =>
      api.post<IncidentRiskDetail>(endpoints.incidentRisks.addSubjects(id), body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: qk.incidentRisks.all })
      qc.invalidateQueries({ queryKey: qk.incidentRisks.detail(vars.id) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
  })
}
