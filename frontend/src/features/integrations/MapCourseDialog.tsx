/**
 * Which behaviour does this course actually move?
 *
 * The candidate list is the union of behaviours already mapped across this
 * catalogue, not a fixed menu — a hardcoded vocabulary would eventually offer a
 * behaviour the targeting engine has never heard of, and hide the ones it acts
 * on. The provider's own topic tags are shown separately and are never
 * pre-ticked: "phishing" as a marketing tag and "report_suspicious_message" as
 * a behaviour this platform measures are different claims.
 */

import { useT } from '../../lib/i18n'
import { useEffect, useState } from 'react'
import { Button, Checkbox, Dialog, Input, Textarea, useToast } from '../../components/ui'
import type { ExternalCourse } from '../../domain/types'
import { humanise } from '../../lib/format'
import { useMapCourse } from './useMapCourse'

export interface MapCourseDialogProps {
  integrationId: number
  course: ExternalCourse | null
  /** Every behaviour any course in this catalogue is already mapped to. */
  vocabulary: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** Normalises a typed behaviour to the snake_case the stored ones use. */
function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '_')
}

export function MapCourseDialog({
  integrationId,
  course,
  vocabulary,
  open,
  onOpenChange,
}: MapCourseDialogProps) {
  const t = useT()
  const toast = useToast()
  const [selected, setSelected] = useState<string[]>([])
  const [custom, setCustom] = useState('')
  const [note, setNote] = useState('')
  const [failure, setFailure] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !course) return
    setSelected(course.mapped_behaviors ?? [])
    setCustom('')
    setNote('')
    setFailure(null)
  }, [open, course])

  const map = useMapCourse(integrationId)

  if (!course) return null
  const target = course

  // Anything already on this course stays offered even if no other course uses
  // it, so opening the dialog can never silently drop an existing mapping.
  const options = [...new Set([...vocabulary, ...(target.mapped_behaviors ?? []), ...selected])].sort(
    (a, b) => a.localeCompare(b),
  )

  function toggle(behaviour: string, checked: boolean) {
    setSelected((current) =>
      checked ? [...new Set([...current, behaviour])] : current.filter((item) => item !== behaviour),
    )
  }

  function addCustom() {
    const value = normalise(custom)
    if (!value) return
    setSelected((current) => [...new Set([...current, value])])
    setCustom('')
  }

  function submit() {
    setFailure(null)
    map.mutate(
      { courseId: target.id, mapped_behaviors: selected, note: note.trim() },
      {
        onSuccess: () => {
          toast.show({
            title: selected.length ? 'Mapping recorded' : 'Mapping removed',
            description: `Your claim about “${target.title}” was written to the audit trail.`,
            tone: 'success',
          })
          onOpenChange(false)
        },
        onError: (error) => setFailure(error.message),
      },
    )
  }

  return (
    <Dialog
      title={t('x.map-course-to-behaviours')}
      description={course.title}
      open={open}
      onOpenChange={map.isPending ? undefined : onOpenChange}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={map.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={map.isPending}>
            {selected.length ? 'Save mapping' : 'Remove all mappings'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-fg-muted">{t('p.a-mapping-is-your-assertion-that')}</p>

        <fieldset className="space-y-2">
          <legend className="label text-fg-faint">{t('u.behaviours-in-use-in-this-catalogue')}</legend>
          {options.length === 0 ? (
            <p className="text-sm text-fg-subtle">{t('p.nothing-in-this-catalogue-is-mapped')}</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {options.map((behaviour) => (
                <Checkbox
                  key={behaviour}
                  label={humanise(behaviour)}
                  checked={selected.includes(behaviour)}
                  onCheckedChange={(checked) => toggle(behaviour, checked)}
                />
              ))}
            </div>
          )}
        </fieldset>

        <div className="flex items-end gap-2">
          <Input
            label={t('p.add-a-behaviour')}
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addCustom()
              }
            }}
            placeholder={t('p.verifypaymentchange')}
            hint={t('p.stored-as-typed-lowercased-and-underscored')}
            className="flex-1"
          />
          <Button variant="secondary" onClick={addCustom} disabled={!custom.trim()}>
            Add
          </Button>
        </div>

        {course.topics?.length ? (
          <div>
            <p className="label text-fg-faint">{t('p.provider-topic-tags')}</p>
            <p className="mt-1.5 flex flex-wrap gap-1.5">
              {course.topics.map((topic) => (
                <span
                  key={topic}
                  className="tech rounded-chip border border-line-subtle bg-base px-1.5 py-0.5 text-xs text-fg-subtle"
                >
                  {topic}
                </span>
              ))}
            </p>
            <p className="mt-1.5 text-xs text-fg-faint">{t('p.supplied-by-the-provider-shown-for')}</p>
          </div>
        ) : null}

        <Textarea
          label={t('u.note')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={2}
          hint={t('p.optional-appended-to-the-audit-entry')}
        />

        {failure ? (
          <p role="alert" className="text-sm text-critical">
            {failure}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
