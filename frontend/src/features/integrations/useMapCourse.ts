/**
 * Claiming that a third-party course moves one of our behaviours.
 *
 * This lives here rather than in the frozen mutation table because the route it
 * calls has no hook there yet. It follows the same contract as the rest of the
 * write layer: it names every cache the change invalidates, and it does not
 * update optimistically — a mapping decides who gets sent to which course, and
 * a mapping that appeared to save and did not would be discovered as a wrongly
 * targeted assignment weeks later.
 *
 * The provider's own topic tags are marketing copy. A mapping is a human's
 * assertion, and the API records it as one, with before and after.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from '../../lib/api/client'
import { endpoints } from '../../lib/api/endpoints'
import { qk } from '../../lib/api/queries'
import type { ExternalCourse } from '../../domain/types'

export interface MapCourseInput {
  courseId: number
  /** Empty is a legitimate un-mapping, and is audited like any other change. */
  mapped_behaviors: string[]
  note?: string
}

export function useMapCourse(integrationId: number | string) {
  const qc = useQueryClient()
  return useMutation<ExternalCourse, ApiError, MapCourseInput>({
    mutationFn: ({ courseId, ...body }) =>
      api.post<ExternalCourse>(endpoints.integrations.mapCourse(courseId), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.integrations.courses(integrationId) })
      qc.invalidateQueries({ queryKey: qk.audit.all })
    },
  })
}
