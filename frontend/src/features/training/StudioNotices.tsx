/**
 * The two things the studio cannot do, said out loud.
 *
 * Both of these would be trivial to fake. A "Generate a module" button that
 * spun for two seconds and produced text, and a version list rendered from
 * `created_at` and a made-up "v1", would both survive a demo — and both would
 * be inventions. The backend generates modules in exactly one place (the CONVERT
 * stage of a loop run, under the approval gate that follows it) and versions
 * nothing at all.
 *
 * So the controls are not rendered as disabled mystery buttons: each says what
 * is missing and points at the real path where one exists.
 */

import { useT } from '../../lib/i18n'
import { History, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Panel } from '../../components/ui'

export function GenerationNotice() {
  const t = useT()
  return (
    <Panel title={t('x.generating-content')} headingLevel={2}>
      <div className="flex gap-3">
        <Sparkles className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        <div className="min-w-0 space-y-3">
          <p className="text-body text-fg-muted">
            The studio has no generate button, because the platform has no studio generator. A
            module is written in one place only: the conversion stage of a loop run, from a threat
            that has already been analyzed. That is what keeps every module traceable to a real
            artifact instead of to a prompt somebody typed.
          </p>
          <p className="text-body text-fg-muted">
            Quiz generation and role variants are part of the same stage and are not separately
            callable. To produce a new module, put an artifact into the loop.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/threats" className="text-sm text-brand hover:underline">
              Submit an artifact in Threat Intake
            </Link>
            <Link to="/approvals" className="text-sm text-brand hover:underline">
              See what is waiting at the approval gate
            </Link>
          </div>
        </div>
      </div>
    </Panel>
  )
}

export function VersionHistoryNotice() {
  const t = useT()
  return (
    <Panel title={t('x.version-history')} headingLevel={2}>
      <div className="flex gap-3">
        <History className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
        <p className="text-body text-fg-muted">
          Version history is not recorded for modules yet. Editing overwrites the stored content in
          place, and no revision is kept — so there is nothing to compare against and nothing to
          roll back to. Policies are versioned; modules are not.
        </p>
      </div>
    </Panel>
  )
}
