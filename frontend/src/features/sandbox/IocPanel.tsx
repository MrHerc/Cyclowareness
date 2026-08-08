/**
 * The merged indicators.
 *
 * Nothing here is a link, and nothing here is clickable. An analyst reading a
 * malware report should not be one stray click from resolving an attacker's
 * domain, so network indicators are rendered defanged and inert. The
 * copy-to-clipboard control gives the real value back deliberately, which is the
 * only way it should leave this page.
 */

import { useT } from '../../lib/i18n'
import type { SandboxJobDetail } from '../../domain/types'
import { CopyButton, Panel } from '../../components/ui'
import { defang } from '../../lib/format'
import { IOC_CATEGORIES } from './shared'

export interface IocPanelProps {
  iocs: SandboxJobDetail['iocs']
}

export function IocPanel({ iocs }: IocPanelProps) {
  const t = useT()
  const groups = IOC_CATEGORIES.map((category) => ({
    ...category,
    values: iocs?.[category.key] ?? [],
  })).filter((group) => group.values.length > 0)

  const total = groups.reduce((sum, group) => sum + group.values.length, 0)

  return (
    <Panel
      title={t('x.indicators')}
      subtitle={t('x.deduplicated-across-every-analyzer-network')}
      actions={
        total > 0 ? (
          <CopyButton
            value={groups
              .map((group) => `${group.label}\n${group.values.join('\n')}`)
              .join('\n\n')}
            label={t('p.copy-every-indicator')}
            variant="secondary"
          >
            {t('u.copy-all')}
          </CopyButton>
        ) : undefined
      }
    >
      {total === 0 ? (
        <p className="text-body text-fg-muted">{t('p.no-indicators-were-extracted-for-a')}</p>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key}>
              <h3 className="label text-fg-subtle">
                {group.label} · {group.values.length}
              </h3>
              <ul className="mt-2 space-y-1">
                {group.values.map((value) => (
                  <li key={value} className="flex items-start gap-2">
                    <span className="tech min-w-0 break-all text-fg-muted">
                      {group.defang ? defang(value) : value}
                    </span>
                    <CopyButton value={value} label={`Copy this ${group.label.toLowerCase()} entry`} />
                  </li>
                ))}
              </ul>
              {group.defang ? (
                <p className="mt-1 text-xs text-fg-faint">{t('p.shown-defanged-copying-gives-the-original')}</p>
              ) : null}
            </section>
          ))}
        </div>
      )}
    </Panel>
  )
}
