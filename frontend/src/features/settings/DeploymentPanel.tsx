/**
 * What this deployment can actually do — the server's answer, not a build guess.
 *
 * Every line here is read from `/api/capabilities` and `/api/sandbox/capabilities`
 * at runtime. That matters most for the two facts a viewer would otherwise get
 * wrong: whether a language model is connected (if not, generated content is
 * template output and is labelled as such everywhere), and whether anything is
 * ever executed (it is not — detonation runs off-host and is reported as not
 * run). Both are stated in words rather than left to a chip.
 *
 * The third fact, added last and the one a buyer asks first: WHERE DO OUR
 * SAMPLES GO. The engine has always been able to answer — it describes every
 * external sandbox it can hand a file to — and the portal never asked, so a
 * deployment uploading every detonatable sample to a CAPEv2 or Cuckoo cluster
 * said only `dynamic_worker: true` and named neither the engine nor the
 * destination.
 */

import { useT } from '../../lib/i18n'
import { MadeBy } from '../../components/shell/MadeBy'
import { AsyncBoundary, SkeletonText } from '../../components/states'
import { Badge, Panel } from '../../components/ui'
import { useCapabilities, useSandboxCapabilities } from '../../lib/api/queries'
import { API_BASE_URL } from '../../lib/api/client'
import { PRODUCT_NAME } from '../../lib/demo/registry'
import { num } from '../../lib/format'
import { SettingRow } from './SettingRow'

export function DeploymentPanel() {
  const t = useT()
  const capabilities = useCapabilities()
  const sandbox = useSandboxCapabilities()

  return (
    <Panel
      title={t('x.this-deployment')}
      subtitle={t('x.read-from-the-platform-at')}
    >
      <AsyncBoundary
        isLoading={capabilities.isLoading}
        error={capabilities.data ? null : capabilities.error}
        onRetry={() => void capabilities.refetch()}
        loadingLabel={t('x.asking-the-platform-what-it')}
        skeleton={<SkeletonText lines={6} />}
      >
        <dl>
          <SettingRow
            term="Product name"
            detail="Configurable per pilot so a deployment can be white-labelled."
          >
            {PRODUCT_NAME}
          </SettingRow>

          {/* The maker, read from the deployment rather than compiled in — and
              deliberately NOT the notifying entity, which is whoever RUNS this
              and whose name goes on a regulatory incident record. */}
          <SettingRow
            term="Built by"
            detail="The vendor that produced the platform. The organisation running it is named separately on incident records."
          >
            <MadeBy variant="inline" />
          </SettingRow>

          <SettingRow
            term="Environment"
            detail={
              capabilities.data?.demo_mode
                ? 'A fictional organisation is seeded for demonstration. The risk engine, the sandbox and the approval gate operating on it are the real ones.'
                : 'Every record on screen belongs to this organisation.'
            }
          >
            <Badge tone={capabilities.data?.demo_mode ? 'neutral' : 'safe'} size="sm">
              {capabilities.data?.demo_mode ? 'Demonstration' : 'Production'}
            </Badge>
          </SettingRow>

          <SettingRow
            term="Language model"
            detail={
              capabilities.data?.ai_provider === 'anthropic'
                ? 'A model is connected. Content it writes is labelled as AI-generated and still passes the human approval gate before anyone receives it.'
                : 'No model is connected. Generated training and briefings are deterministic template output, and are labelled as template rather than as AI.'
            }
          >
            {capabilities.data?.ai_provider === 'anthropic' ? (
              <Badge tone="ai" size="sm">
                Anthropic
              </Badge>
            ) : (
              <Badge tone="neutral" size="sm">
                Template engine
              </Badge>
            )}
          </SettingRow>

          <SettingRow
            term="Configured analyzer"
            detail="The sandbox pipeline this deployment runs submissions through."
          >
            <span className="tech">{capabilities.data?.analyzer ?? 'Not reported'}</span>
          </SettingRow>

          <SettingRow
            term="API origin"
            detail={
              API_BASE_URL
                ? 'This build talks to a separate API host.'
                : 'The API and this interface are served from one origin, so there is no cross-origin request and the loop stream is same-origin.'
            }
          >
            <span className="tech">{API_BASE_URL || 'Same origin as this page'}</span>
          </SettingRow>
        </dl>
      </AsyncBoundary>

      <div className="mt-6 border-t border-line-subtle pt-4">
        <h3 className="text-h text-fg">{t('y.analysis-capability')}</h3>
        <AsyncBoundary
          isLoading={sandbox.isLoading}
          error={sandbox.data ? null : sandbox.error}
          onRetry={() => void sandbox.refetch()}
          loadingLabel={t('x.asking-the-sandbox-what-it')}
          skeleton={<SkeletonText lines={4} className="mt-3" />}
        >
          <dl className="mt-1">
            <SettingRow
              term="Static analyzers"
              detail={
                Object.keys(sandbox.data?.unavailable_analyzers ?? {}).length > 0
                  ? `${num(Object.keys(sandbox.data?.unavailable_analyzers ?? {}).length)} analyzer(s) are not available on this host and are reported as not run rather than skipped silently.`
                  : 'Every analyzer this build knows about loaded on this host.'
              }
            >
              {num((sandbox.data?.static_analyzers ?? []).length)} loaded
            </SettingRow>

            <SettingRow
              term="YARA rules"
              detail={
                sandbox.data?.yara?.error
                  ? `The YARA tier did not initialise: ${sandbox.data.yara.error}. Rule matches are absent from every report on this host.`
                  : 'Compiled at startup and applied to every submission.'
              }
            >
              {num(sandbox.data?.yara?.loaded ?? 0)} compiled
            </SettingRow>

            {/* Reported, not asserted. `null` is "this host cannot tell" — a
                Windows dev box, or a kernel with no /proc/mounts — which is a
                third answer, never folded into "not hardened". */}
            <SettingRow
              term="Quarantine execution"
              detail={
                sandbox.data?.quarantine_noexec === true
                  ? 'The kernel would refuse to execute a file in the quarantine. Read from the host mounts, not assumed.'
                  : sandbox.data?.quarantine_noexec === false
                    ? 'The quarantine is NOT mounted noexec on this host. Samples are never executed by the analysis, but the mount does not enforce it.'
                    : 'This host cannot report whether the quarantine is mounted noexec.'
              }
            >
              <Badge
                tone={
                  sandbox.data?.quarantine_noexec === true
                    ? 'safe'
                    : sandbox.data?.quarantine_noexec === false
                      ? 'medium'
                      : 'neutral'
                }
                size="sm"
              >
                {sandbox.data?.quarantine_noexec === true
                  ? 'noexec enforced'
                  : sandbox.data?.quarantine_noexec === false
                    ? 'not enforced'
                    : 'Not reported'}
              </Badge>
            </SettingRow>

            {/* ABSENCE IS NOT AN ANSWER OF "NONE". With `integrations` missing —
                an older server, or the optional layer failing to import — this
                read "0 of 0" under "No external engine is configured to receive
                a sample", which states as fact the one thing the deployment had
                just failed to report. The panel exists to answer where samples
                go; saying "nowhere" when it does not know is worse than saying
                nothing. */}
            <SettingRow
              term="Sample destinations"
              detail={
                sandbox.data?.integrations === undefined
                  ? 'This deployment did not report its integration matrix, so where a sample would go cannot be answered here.'
                  : sandbox.data.integrations.length === 0
                    ? 'The integrations layer did not load on this host, so the destinations it would describe are unknown rather than absent.'
                    : sandbox.data.integrations.some((i) => i.configured && i.sends_data_off_host)
                      ? 'At least one configured engine receives data from this deployment. What each one receives is named below.'
                      : 'No external engine is configured to receive anything from this deployment.'
              }
            >
              {sandbox.data?.integrations === undefined || sandbox.data.integrations.length === 0 ? (
                <span className="text-fg-subtle">Not reported</span>
              ) : (
                <>
                  {num(
                    sandbox.data.integrations.filter(
                      (i) => i.configured && i.sends_data_off_host,
                    ).length,
                  )}{' '}
                  of {num(sandbox.data.integrations.length)} send data off-host
                </>
              )}
            </SettingRow>

            <SettingRow
              term="Dynamic detonation"
              detail={
                sandbox.data?.dynamic_worker
                  ? 'A detonation worker is attached. Behavioural signals in a report were observed, not inferred.'
                  : 'No detonation worker is attached, so nothing submitted here is executed. Reports say so per tier rather than leaving a viewer to assume a sample was run.'
              }
            >
              <Badge tone={sandbox.data?.dynamic_worker ? 'safe' : 'medium'} size="sm">
                {sandbox.data?.dynamic_worker ? t('w.worker-attached') : t('w.static-analysis-only')}
              </Badge>
            </SettingRow>
          </dl>

          {(sandbox.data?.integrations ?? []).length > 0 ? (
            <ul className="mt-4 space-y-2">
              {(sandbox.data?.integrations ?? []).map((engine) => (
                <li
                  key={engine.key}
                  className="rounded-panel border border-line-subtle bg-surface p-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-fg">{engine.name}</span>
                    <Badge tone={engine.configured ? 'safe' : 'neutral'} size="sm">
                      {engine.configured ? 'Configured' : 'Not configured'}
                    </Badge>
                    {engine.sends_data_off_host ? (
                      // "Sends data off-host", NOT "receives the sample". The flag
                      // is true for both, and they are not the same disclosure:
                      // Cuckoo, CAPEv2 and Joe upload the FILE, VirusTotal sends
                      // only a SHA-256 and "uploads nothing" in the engine's own
                      // words. Labelling every row with the stronger claim would
                      // overstate exposure on the one engine most deployments
                      // have — in the panel built to stop overstatement. What
                      // actually leaves is in `notes`, rendered below.
                      <Badge tone={engine.blocked_by_sovereign_mode ? 'neutral' : 'medium'} size="sm">
                        {engine.blocked_by_sovereign_mode
                          ? 'Blocked by sovereign mode'
                          : 'Sends data off-host'}
                      </Badge>
                    ) : null}
                  </div>
                  {/* The engine's own description of WHAT leaves. Without it the
                      panel says data goes somewhere and never says what, which
                      is the question the reader opened it for. */}
                  <p className="mt-1 text-xs text-fg-muted">{engine.notes}</p>
                  <p className="mt-1 text-xs text-fg-subtle">{engine.requires}</p>
                  {/* NEVER DROP THIS TO TIDY THE PANEL. `configured` is read from
                      THIS process's environment while the engine runs on the
                      off-host worker, so on a split deployment — the shape this
                      product actually has — the flag can be false while the
                      attached worker has the variable set. Without the caveat
                      the row answers a procurement question with the wrong
                      machine's configuration, and reads as authoritative. */}
                  {engine.configuration_caveat ? (
                    <p className="mt-1 text-xs text-fg-faint">{engine.configuration_caveat}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </AsyncBoundary>
      </div>
    </Panel>
  )
}
