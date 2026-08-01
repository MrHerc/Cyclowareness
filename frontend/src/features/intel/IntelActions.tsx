/**
 * Question five: what should happen about this advisory.
 *
 * Every control here reaches a real endpoint. The two things the platform
 * cannot do from an advisory — create training, start a closed loop — are not
 * rendered as buttons that quietly do nothing. They are rendered as the path
 * that does work, with a link to it and a sentence saying why the shortcut does
 * not exist: training is assigned from a finding, where the affected people are
 * already named, and a loop starts from an artifact the sandbox can analyse.
 */

import { GraduationCap, Radar, ShieldAlert, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge, Button } from '../../components/ui'
import type { IntelItemDetail } from '../../domain/types'
import { formatDate } from '../../lib/format'
import { AssessDialog } from './AssessDialog'
import { CreateFindingDialog } from './CreateFindingDialog'
import { DismissDialog } from './DismissDialog'
import { Question } from './Question'

function Route({
  icon: Icon,
  heading,
  body,
  to,
  linkLabel,
}: {
  icon: LucideIcon
  heading: string
  body: string
  to: string
  linkLabel: string
}) {
  return (
    <div className="flex gap-3 rounded-control border border-line-subtle bg-base p-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-fg-faint" aria-hidden="true" strokeWidth={1.5} />
      <div className="min-w-0">
        <p className="text-body text-fg">{heading}</p>
        <p className="mt-1 text-sm leading-relaxed text-fg-subtle">{body}</p>
        <Link to={to} className="mt-1.5 inline-block text-sm text-brand hover:underline">
          {linkLabel}
        </Link>
      </div>
    </div>
  )
}

export interface IntelActionsProps {
  item: IntelItemDetail
  canManage: boolean
}

export function IntelActions({ item, canManage }: IntelActionsProps) {
  const [dialog, setDialog] = useState<'assess' | 'dismiss' | 'finding' | null>(null)
  const findings = item.findings ?? []
  const dismissed = Boolean(item.dismissed_by)

  return (
    <Question index={5} heading="Should training or a finding be created?">
      <div className="space-y-4">
        {findings.length > 0 ? (
          <div>
            <p className="label text-fg-faint">Already raised from this advisory</p>
            <ul className="mt-1.5 space-y-1.5">
              {findings.map((finding) => (
                <li key={finding.id}>
                  <Link
                    to={`/policy-intelligence/findings/${finding.id}`}
                    className="flex items-center justify-between gap-3 rounded-control border border-line bg-base px-3 py-2 hover:border-line-strong"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-body text-fg">{finding.title}</span>
                      <span className="block text-xs text-fg-faint">
                        Finding #{finding.id} · raised {formatDate(finding.detected_at)}
                      </span>
                    </span>
                    <Badge status={finding.status} size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {dismissed ? (
          <div className="rounded-control border border-line bg-base p-3">
            <p className="text-body text-fg">
              Dismissed by {item.dismissed_by}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-fg-subtle">
              {item.dismissed_reason?.trim() || 'No reason was recorded.'} A dismissed advisory
              cannot raise a finding — record a fresh assessment to bring it back into the queue
              first.
            </p>
          </div>
        ) : null}

        {canManage ? (
          <div className="flex flex-wrap gap-2">
            {dismissed ? null : (
              <Button
                variant="primary"
                icon={<ShieldAlert className="size-4" aria-hidden="true" />}
                onClick={() => setDialog('finding')}
              >
                Raise a policy finding
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDialog('assess')}>
              {item.relevance === 'unassessed' ? 'Assess relevance' : 'Change assessment'}
            </Button>
            {dismissed ? null : (
              <Button variant="ghost" onClick={() => setDialog('dismiss')}>
                Dismiss
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-fg-subtle">
            Your role can read intelligence but not assess, dismiss or raise findings from it.
          </p>
        )}

        <div className="space-y-2">
          <Route
            icon={GraduationCap}
            heading="Training is not created from an advisory"
            body="An advisory names a product, not a person. Training is assigned from a finding, where the affected departments and people are already recorded — raise the finding first, then assign training on it."
            to="/policy-intelligence/findings"
            linkLabel="Open policy findings"
          />
          <Route
            icon={Radar}
            heading="A closed loop starts from an artifact"
            body="The loop converts something the sandbox can analyse — an email, a URL, a file — into targeted training. An advisory is a document about a threat, not the artifact itself, so there is no path from here into a loop."
            to="/threats"
            linkLabel="Open threat intake"
          />
        </div>
      </div>

      {dialog === 'assess' ? (
        <AssessDialog item={item} open onOpenChange={(open) => setDialog(open ? 'assess' : null)} />
      ) : null}
      {dialog === 'dismiss' ? (
        <DismissDialog item={item} open onOpenChange={(open) => setDialog(open ? 'dismiss' : null)} />
      ) : null}
      {dialog === 'finding' ? (
        <CreateFindingDialog
          item={item}
          open
          onOpenChange={(open) => setDialog(open ? 'finding' : null)}
        />
      ) : null}
    </Question>
  )
}
