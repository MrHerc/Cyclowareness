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

import { useT } from '../../lib/i18n'
import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { ConfirmationDialog } from '../../components/states'
import { Button, Panel, useToast } from '../../components/ui'
import { useResetDemo } from '../../lib/api/mutations'

const CONFIRM_PHRASE = 'RESET'

export function DemoControls() {
  const t = useT()
  const toast = useToast()
  const [open, setOpen] = useState(false)

  const reset = useResetDemo({
    onSuccess: () => {
      setOpen(false)
      toast.show({
        title: t('p.demonstration-world-rebuilt'),
        description:
          t('p.caspian-dynamics-has-been-reseeded-with'),
        tone: 'success',
      })
    },
    onError: (error) =>
      toast.show({ title: 'Reset failed', description: error.message, tone: 'error' }),
  })

  return (
    <Panel
      tone="danger"
      title={t('x.demonstration-controls')}
      subtitle={t('x.available-because-this-deployment-reports')}
    >
      <div className="space-y-4">
        <p className="text-body text-fg-muted">{t('p.resetting-deletes-every-loop-run-approval')}</p>

        <Button
          variant="danger"
          icon={<RotateCcw className="size-4" aria-hidden="true" strokeWidth={1.75} />}
          onClick={() => setOpen(true)}
        >
          {t('u.reset-the-demonstration-world-2')}
        </Button>
      </div>

      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title={t('x.reset-the-demonstration-world')}
        description={t('x.every-loop-run-approval-assignment')}
        confirmLabel={t('p.reset-everything')}
        tone="danger"
        requireTyped={CONFIRM_PHRASE}
        busy={reset.isPending}
        onConfirm={() => reset.mutate()}
      />
    </Panel>
  )
}
