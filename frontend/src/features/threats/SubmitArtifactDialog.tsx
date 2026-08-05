/**
 * Analyst submission — stage 1 of the loop, by hand.
 *
 * The submit route does not create a draft: it writes a `Threat`, starts a
 * `LoopRun` and returns the run id, so the artifact is being analysed before
 * this dialog closes. That is why the confirm control says what it will do and
 * why success navigates to the run rather than dropping the analyst back on a
 * list where nothing visibly changed.
 *
 * The body is required and the title is not — the server writes a title from
 * the artifact type when one is missing, and a required field that the server
 * happily defaults is a field that exists to annoy people.
 */

import { useT } from '../../lib/i18n'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Dialog, Input, Select, Textarea, useToast } from '../../components/ui'
import { useSubmitThreat } from '../../lib/api/mutations'
import { ARTIFACT_TYPE_OPTIONS } from './filters'
import { ActionError } from './IntakeAtoms'

const FORM_ID = 'submit-artifact-form'

export interface SubmitArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SubmitArtifactDialog({ open, onOpenChange }: SubmitArtifactDialogProps) {
  const t = useT()
  const navigate = useNavigate()
  const toast = useToast()

  const [artifactType, setArtifactType] = useState('email')
  const [title, setTitle] = useState('')
  const [sender, setSender] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [bodyError, setBodyError] = useState<string | null>(null)

  const submit = useSubmitThreat({
    onSuccess: (data) => {
      toast.show({
        title: `Loop run ${data.loop_run_id} started`,
        description: 'The artifact is being analysed. Stage 3 will stop at the approval gate.',
        tone: 'success',
      })
      close()
      navigate(`/loops/${data.loop_run_id}`)
    },
    onError: (error) => {
      toast.show({ title: 'The artifact was not accepted', description: error.message, tone: 'error' })
    },
  })

  function close() {
    onOpenChange(false)
    setTitle('')
    setSender('')
    setSubject('')
    setBody('')
    setBodyError(null)
    submit.reset()
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!body.trim()) {
      setBodyError('The artifact body is what gets analysed — it cannot be empty.')
      return
    }
    setBodyError(null)

    // Only the keys the analyzer reads are sent. An empty string in
    // `artifact_meta` is a recorded fact ("the sender was blank"), which is not
    // what a skipped field means.
    const meta: Record<string, string> = {}
    if (artifactType === 'email') {
      if (sender.trim()) meta.sender = sender.trim()
      if (subject.trim()) meta.subject = subject.trim()
    }

    submit.mutate({
      artifact_type: artifactType,
      artifact_ref: body,
      title: title.trim(),
      artifact_meta: meta,
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
      title={t('x.submit-an-artifact')}
      description={t('x.this-starts-a-loop-run')}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={submit.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="primary" loading={submit.isPending}>
            Submit and start the loop
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Artifact type"
          options={ARTIFACT_TYPE_OPTIONS}
          value={artifactType}
          onValueChange={setArtifactType}
          hint="Chooses how the analyzer reads the body below."
        />

        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          hint="Optional. Left blank, the platform names it after the artifact type."
          autoComplete="off"
        />

        {artifactType === 'email' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Sender"
              value={sender}
              onChange={(event) => setSender(event.target.value)}
              hint="Recorded as-is. Never contacted."
              autoComplete="off"
              spellCheck={false}
            />
            <Input
              label="Subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              autoComplete="off"
            />
          </div>
        ) : null}

        <Textarea
          label="Artifact body"
          required
          rows={9}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          error={bodyError}
          hint="Raw headers, message text, URL or filename. Stored as inert text and never fetched."
          spellCheck={false}
          textareaClassName="tech"
        />

        <ActionError error={submit.error} />
      </form>
    </Dialog>
  )
}
