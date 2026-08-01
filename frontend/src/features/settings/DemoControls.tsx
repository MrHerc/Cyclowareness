/**
 * Rebuilding the demonstration world.
 *
 * This is the only genuinely destructive control in the product, so it carries
 * the only typed confirmation: reset wipes every loop run, approval, assignment,
 * sandbox job and audit entry and re-seeds the fictional organisation from
 * scratch. An hour before a keynote that should take more than a reflex click on
 * a red button.
 *
 * The panel renders only when the server reports `demo_mode`. In a production
 * build the route does not exist, and a button that 404s reads as a broken
 * product rather than as a missing feature.
 */

import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { ConfirmationDialog } from '../../components/states'
import { Button, Panel, useToast } from '../../components/ui'
import { useResetDemo } from '../../lib/api/mutations'

const CONFIRM_PHRASE = 'RESET'

export function DemoControls() {
  const toast = useToast()
  const [open, setOpen] = useState(false)

  const reset = useResetDemo({
    onSuccess: () => {
      setOpen(false)
      toast.show({
        title: 'Demonstration world rebuilt',
        description:
          'Caspian Dynamics has been re-seeded with six months of history re-anchored to now.',
        tone: 'success',
      })
    },
    onError: (error) =>
      toast.show({ title: 'Reset failed', description: error.message, tone: 'error' }),
  })

  return (
    <Panel
      tone="danger"
      title="Demonstration controls"
      subtitle="Available because this deployment reports demo mode. These routes do not exist in a production build."
    >
      <div className="space-y-4">
        <p className="text-body text-fg-muted">
          Resetting deletes every loop run, approval decision, training assignment, quiz result,
          sandbox job and audit entry, then rebuilds the seeded organisation deterministically — the
          same people, the same six months of history, re-anchored to today. Nothing is recoverable
          afterwards.
        </p>

        <Button
          variant="danger"
          icon={<RotateCcw className="size-4" aria-hidden="true" strokeWidth={1.75} />}
          onClick={() => setOpen(true)}
        >
          Reset the demonstration world
        </Button>
      </div>

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Reset the demonstration world"
        description="Every loop run, approval, assignment, sandbox job and audit entry is deleted and the seeded organisation is rebuilt. This cannot be undone."
        confirmLabel="Reset everything"
        tone="danger"
        requireTyped={CONFIRM_PHRASE}
        busy={reset.isPending}
        onConfirm={() => reset.mutate()}
      />
    </Panel>
  )
}
