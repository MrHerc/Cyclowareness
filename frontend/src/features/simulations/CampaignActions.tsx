/**
 * Launch, close, and the one control that is not a product feature.
 *
 * `auto-outcomes` fabricates per-person behaviour from a dice roll weighted by
 * the employee's own risk score, and writes it into the same risk trail real
 * behaviour writes to. The backend registers that route only when `APP_ENV=demo`
 * — so this UI asks `useCapabilities()` rather than assuming, and when it does
 * render it says the word "synthetic" on the button, in the confirmation, and
 * in the toast afterwards. Every number downstream of it would otherwise be
 * indistinguishable from a measurement.
 */

import { useState } from 'react'
import { CheckCheck, Dices, Send } from 'lucide-react'
import { ConfirmationDialog } from '../../components/states'
import { Button, useToast } from '../../components/ui'
import type { SimulationDetail } from '../../domain/types'
import { useSimulationAction } from '../../lib/api/mutations'
import { useCapabilities } from '../../lib/api/queries'
import { num } from '../../lib/format'

export interface CampaignActionsProps {
  simulation: SimulationDetail
}

export function CampaignActions({ simulation }: CampaignActionsProps) {
  const toast = useToast()
  const capabilities = useCapabilities()
  const [confirming, setConfirming] = useState<'complete' | 'synthetic' | null>(null)

  const launch = useSimulationAction('launch', {
    onSuccess: () =>
      toast.show({
        title: 'Campaign launched',
        description: 'Targets are now open for outcome recording.',
        tone: 'success',
      }),
    onError: (error) =>
      toast.show({ title: 'Launch failed', description: error.message, tone: 'error' }),
  })

  const complete = useSimulationAction('complete', {
    onSuccess: () => {
      setConfirming(null)
      toast.show({ title: 'Campaign closed', tone: 'success' })
    },
    onError: (error) => {
      setConfirming(null)
      toast.show({ title: 'Could not close the campaign', description: error.message, tone: 'error' })
    },
  })

  const synthetic = useSimulationAction('autoOutcomes', {
    onSuccess: () => {
      setConfirming(null)
      toast.show({
        title: 'Synthetic outcomes written',
        description: 'These were generated, not observed. They are demonstration data.',
        tone: 'warning',
      })
    },
    onError: (error) => {
      setConfirming(null)
      toast.show({ title: 'Could not generate outcomes', description: error.message, tone: 'error' })
    },
  })

  const pending = simulation.targets.filter((target) => target.outcome === 'pending').length
  const demoMode = capabilities.data?.demo_mode === true

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {simulation.status === 'draft' ? (
          <Button
            variant="primary"
            loading={launch.isPending}
            onClick={() => launch.mutate(simulation.id)}
            icon={<Send className="size-4" aria-hidden="true" />}
          >
            Launch campaign
          </Button>
        ) : null}

        {simulation.status === 'active' ? (
          <Button
            variant="secondary"
            onClick={() => setConfirming('complete')}
            icon={<CheckCheck className="size-4" aria-hidden="true" />}
          >
            Close campaign
          </Button>
        ) : null}

        {demoMode && simulation.status === 'active' && pending > 0 ? (
          <Button
            variant="outline"
            onClick={() => setConfirming('synthetic')}
            icon={<Dices className="size-4" aria-hidden="true" />}
          >
            Fill outcomes synthetically (demo)
          </Button>
        ) : null}
      </div>

      <ConfirmationDialog
        open={confirming === 'complete'}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
        title="Close this campaign"
        description={`${num(pending)} ${pending === 1 ? 'target is' : 'targets are'} still pending. Closing the campaign stops any further outcome from being recorded, and those targets stay unresolved — they will not count toward the click or report rate.`}
        confirmLabel="Close campaign"
        onConfirm={() => complete.mutate(simulation.id)}
        busy={complete.isPending}
      />

      <ConfirmationDialog
        open={confirming === 'synthetic'}
        onOpenChange={(open) => {
          if (!open) setConfirming(null)
        }}
        tone="danger"
        title="Generate synthetic outcomes"
        description={`This invents behaviour for ${num(pending)} pending ${pending === 1 ? 'target' : 'targets'} by rolling against each person's risk score, and writes the result into the real risk trail. Nothing was observed. Use it only to demonstrate the loop — the click and report rates afterwards are not measurements.`}
        confirmLabel="Write synthetic outcomes"
        requireTyped="synthetic"
        onConfirm={() => synthetic.mutate(simulation.id)}
        busy={synthetic.isPending}
      />
    </>
  )
}
