/**
 * Author a training module by hand.
 *
 * The dialog collects only what a person must decide — title, channel, length,
 * a one-line description. Content and quiz are written in the editor the module
 * opens into, because a modal is the wrong place to write a lesson.
 *
 * There is no AI switch here and no provenance field. The server pins
 * `ai_generated=False` and `generation_source=""` on this path; a hand-written
 * module cannot be dressed as a model's work from the client, which is the same
 * provenance rule the rest of the product enforces in the other direction.
 *
 * The new module lands in PENDING_REVIEW like everything else: authoring and
 * approving stay two different acts even when one person will do both.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { ApiError } from '../../lib/api/client'
import { useCreateModule } from '../../lib/api/mutations'
import { Button, Dialog, Input, Select, Textarea } from '../../components/ui'

const CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS / phone' },
  { value: 'qr', label: 'QR code' },
  { value: 'chat', label: 'Chat' },
  { value: 'web', label: 'Web' },
]

export function NewModuleDialog() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [channel, setChannel] = useState('email')
  const [minutes, setMinutes] = useState('3')
  const create = useCreateModule({
    onSuccess: (module) => {
      setOpen(false)
      // Straight into the editor — the module is a shell until it has content,
      // and the person who just named it is the person about to write it.
      navigate(`/training/${module.id}`)
    },
  })

  const parsedMinutes = Number.parseInt(minutes, 10)
  const minutesValid = Number.isFinite(parsedMinutes) && parsedMinutes >= 1 && parsedMinutes <= 60
  const canSubmit = title.trim().length >= 3 && minutesValid && !create.isPending

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) create.reset()
      }}
      title="New training module"
      description="Named here, written in the editor it opens into. It starts in pending review."
      trigger={
        <Button icon={<Plus className="size-4" aria-hidden="true" />}>New module</Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          create.mutate({
            title: title.trim(),
            description: description.trim(),
            channel,
            est_minutes: parsedMinutes,
            content: [],
            quiz: [],
            takeaway: '',
          })
        }}
      >
        <Input
          id="new-module-title"
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={255}
          hint="At least three characters. Sentence case, like the rest of the catalogue."
        />

        <Textarea
          id="new-module-description"
          label="One-line description"
          rows={2}
          maxLength={500}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select
            label="Channel"
            options={CHANNELS}
            value={channel}
            onValueChange={setChannel}
            hint="The delivery route this lesson teaches about."
          />
          <Input
            id="new-module-minutes"
            label="Estimated minutes"
            type="number"
            min={1}
            max={60}
            value={minutes}
            onChange={(event) => setMinutes(event.target.value)}
            error={minutes && !minutesValid ? 'Between 1 and 60.' : null}
          />
        </div>

        {create.error ? (
          <p className="text-sm text-critical">
            {create.error instanceof ApiError
              ? create.error.message
              : 'The module could not be created.'}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={!canSubmit} loading={create.isPending}>
            Create and open the editor
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
