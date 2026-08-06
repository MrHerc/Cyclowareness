/**
 * ATT&CK techniques, each with the finding that justifies it.
 *
 * The evidence column is the point. A technique list with nothing behind it is
 * an assertion, and an analyst asked to defend "T1055 — Process Injection" needs
 * to be able to name the signal that produced it in the same glance. Every row
 * here carries the signal ids it was mapped from.
 *
 * Technique ids are not linked out. The report is read in environments where a
 * click that leaves the building is a decision, not a convenience, and the id is
 * copyable text anyone can paste into their own reference.
 */

import { useT } from '../../lib/i18n'
import type { MitreTechnique } from '../../domain/types'
import { Panel } from '../../components/ui'

export interface MitrePanelProps {
  techniques: MitreTechnique[]
}

export function MitrePanel({ techniques }: MitrePanelProps) {
  const t = useT()
  if (techniques.length === 0) return null

  // One group per tactic, in the order the techniques arrived — the engine
  // already emits them in a sensible order and re-sorting would lose it.
  const byTactic = techniques.reduce<Record<string, MitreTechnique[]>>((acc, technique) => {
    const tactic = technique.tactic || 'Unmapped'
    ;(acc[tactic] ??= []).push(technique)
    return acc
  }, {})

  return (
    <Panel>
      <h2 className="text-h text-fg">{t('y.mitre-attampck')}</h2>
      <p className="mt-1 text-sm text-fg-muted">{t('p.techniques-mapped-from-findings-this-analysis')}</p>

      <div className="mt-4 space-y-5">
        {Object.entries(byTactic).map(([tactic, rows]) => (
          <div key={tactic}>
            <p className="label text-fg-subtle">{tactic}</p>
            <ul className="mt-2 space-y-2">
              {rows.map((technique) => (
                <li
                  key={technique.technique_id}
                  className="rounded-panel border border-line-subtle p-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="tech text-sm text-brand">{technique.technique_id}</span>
                    <span className="text-body text-fg">{technique.name}</span>
                  </div>
                  {technique.evidence.length > 0 ? (
                    <p className="mt-1.5 text-xs text-fg-faint">
                      From{' '}
                      {technique.evidence.map((id, index) => (
                        <span key={id}>
                          {index > 0 ? ', ' : ''}
                          <span className="tech">{id}</span>
                        </span>
                      ))}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Panel>
  )
}
