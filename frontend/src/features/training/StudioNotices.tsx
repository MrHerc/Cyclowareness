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
          <p className="text-body text-fg-muted">{t('p.the-studio-has-no-generate-button')}</p>
          <p className="text-body text-fg-muted">{t('p.quiz-generation-and-role-variants-are')}</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/threats" className="text-sm text-brand hover:underline">
              {t('u.submit-an-artifact-in-threat-intake')}
            </Link>
            <Link to="/approvals" className="text-sm text-brand hover:underline">
              {t('u.see-what-is-waiting-at-the-approval')}
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
        <p className="text-body text-fg-muted">{t('p.version-history-is-not-recorded-for')}</p>
      </div>
    </Panel>
  )
}
