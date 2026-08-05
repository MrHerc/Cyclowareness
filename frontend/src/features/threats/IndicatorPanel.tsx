/**
 * The indicators, by category.
 *
 * Every value is rendered defanged, in mono, as plain text. Nothing in this
 * panel is an anchor and nothing ever will be: an analyst tool that turns a live
 * malicious URL into a clickable link is an incident, not a styling choice. The
 * copy control puts the defanged form on the clipboard for the same reason —
 * that is what goes into a ticket.
 *
 * Hashes are shown raw. Defanging exists to break a URL, and a digest has
 * nothing to break.
 */

import { useT } from '../../lib/i18n'
import { Fingerprint } from 'lucide-react'
import { EmptyState } from '../../components/states'
import { CopyButton, Panel } from '../../components/ui'
import type { Threat } from '../../domain/types'
import { defang } from '../../lib/format'

export interface IndicatorPanelProps {
  iocs: Threat['iocs']
}

interface Group {
  key: string
  label: string
  values: string[]
  /** False for digests, which are not network indicators. */
  defanged: boolean
}

export function IndicatorPanel({ iocs }: IndicatorPanelProps) {
  const t = useT()
  const groups: Group[] = [
    { key: 'urls', label: 'URLs', values: iocs?.urls ?? [], defanged: true },
    { key: 'domains', label: 'Domains', values: iocs?.domains ?? [], defanged: true },
    { key: 'sender_patterns', label: 'Sender patterns', values: iocs?.sender_patterns ?? [], defanged: true },
    { key: 'hashes', label: 'Hashes', values: iocs?.hashes ?? [], defanged: false },
  ].filter((group) => group.values.length > 0)

  const total = groups.reduce((sum, group) => sum + group.values.length, 0)

  return (
    <Panel
      title={t('x.indicators')}
      subtitle={total > 0 ? `${total} extracted by the analyzer. Defanged, and never clickable.` : undefined}
    >
      {groups.length === 0 ? (
        <EmptyState
          compact
          icon={Fingerprint}
          headline="No indicators were extracted"
          description={t('x.the-analyzer-found-nothing-it')}
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const shown = group.defanged ? group.values.map((value) => defang(value)) : group.values
            return (
              <section key={group.key}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="label text-fg-faint">
                    {group.label} · {group.values.length}
                  </h3>
                  <CopyButton
                    value={shown.join('\n')}
                    label={`Copy ${group.label.toLowerCase()}${group.defanged ? ' (defanged)' : ''}`}
                  />
                </div>
                <ul className="mt-1.5 space-y-1">
                  {shown.map((value, index) => (
                    <li
                      key={`${group.key}-${index}`}
                      className="tech break-all rounded-control bg-void px-2.5 py-1.5 text-fg-muted"
                    >
                      {value}
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </Panel>
  )
}
