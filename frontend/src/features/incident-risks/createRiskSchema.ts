/**
 * What a new incident risk must say before anyone is put on the hook for it.
 *
 * The schema deliberately carries no transforms. Every field is a string in and
 * a string out, and the conversion to the server's shape happens once, in
 * `toCreatePayload`. That keeps the form's value type and its validated type
 * identical — which is what stops a resolver generic from quietly turning
 * `min_score` into a number in one place and a string in another.
 *
 * The required fields are the ones whose absence would make the record unusable
 * later rather than merely incomplete: what happened, what the person must do,
 * who approved it, and what "done" means. Everything the server defaults, this
 * form leaves optional.
 */

import { z } from 'zod'

const filled = (message: string) => z.string().refine((value) => value.trim().length > 0, message)

export const createRiskSchema = z.object({
  title: filled('Give the risk a title an auditor could find it by.').refine(
    (value) => value.trim().length >= 6,
    'A title of a word or two will not identify this later — be specific.',
  ),
  incident_ref: z.string(),
  risk_type: z.enum([
    'user_action',
    'privileged_exposure',
    'data_mishandling',
    'procedure_failure',
    'alert_fatigue',
    'knowledge_gap',
  ]),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  description: filled('Say what happened. This is the record the affected person may read.').refine(
    (value) => value.trim().length >= 20,
    'One clause is not a description. Say what happened and how it was found.',
  ),
  confidentiality: z.enum(['public', 'internal', 'restricted', 'secret']),
  // `none` rather than `''`: a Radix select item cannot carry an empty value,
  // and an option nobody can pick is worse than one with a sentinel.
  affected_department_id: z.string(),
  required_action: filled('State what the affected people must actually do.'),
  requires_training: z.boolean(),
  requires_quiz: z.boolean(),
  requires_sandbox: z.boolean(),
  min_score: z
    .string()
    .refine(
      (value) => value.trim() === '' || /^(100|[1-9]?\d)$/.test(value.trim()),
      'Enter a whole number from 0 to 100, or leave it blank.',
    ),
  deadline: z.string(),
  approver_name: filled('Name the person who approved charging this to an employee.'),
  closure_criteria: filled('Say what would make this risk closable. It is quoted back at closure.'),
  evidence: z.array(
    z.object({ label: z.string(), value: z.string(), ref: z.string() }),
  ),
})

export type CreateRiskValues = z.infer<typeof createRiskSchema>

export const CREATE_RISK_DEFAULTS: CreateRiskValues = {
  title: '',
  incident_ref: '',
  risk_type: 'user_action',
  severity: 'medium',
  description: '',
  confidentiality: 'internal',
  affected_department_id: 'none',
  required_action: '',
  requires_training: true,
  requires_quiz: false,
  requires_sandbox: false,
  min_score: '',
  deadline: '',
  approver_name: '',
  closure_criteria: '',
  evidence: [{ label: '', value: '', ref: '' }],
}

/**
 * The form's values as the API wants them.
 *
 * A blank optional field is omitted rather than sent as `""`, and a blank
 * `min_score` becomes `null` — the server reads null as "no bar was set", which
 * is a different fact from a bar of zero.
 */
export function toCreatePayload(values: CreateRiskValues): Record<string, unknown> {
  const evidence = values.evidence
    .map((row) => ({ label: row.label.trim(), value: row.value.trim(), ref: row.ref.trim() }))
    .filter((row) => row.label !== '' || row.value !== '')
    .map((row) => (row.ref ? row : { label: row.label, value: row.value }))

  const departmentId = values.affected_department_id.trim()
  const minScore = values.min_score.trim()
  const deadline = values.deadline.trim()

  return {
    title: values.title.trim(),
    incident_ref: values.incident_ref.trim(),
    risk_type: values.risk_type,
    severity: values.severity,
    description: values.description.trim(),
    confidentiality: values.confidentiality,
    affected_department_id:
      departmentId === '' || departmentId === 'none' ? null : Number(departmentId),
    evidence,
    required_action: values.required_action.trim(),
    requires_training: values.requires_training,
    requires_quiz: values.requires_quiz,
    requires_sandbox: values.requires_sandbox,
    min_score: minScore === '' ? null : Number(minScore),
    // A date input carries no time. A deadline is understood as the end of that
    // day, not midnight at its start — the difference is a whole working day.
    deadline: deadline === '' ? null : `${deadline}T23:59:59Z`,
    approver_name: values.approver_name.trim(),
    closure_criteria: values.closure_criteria.trim(),
  }
}
