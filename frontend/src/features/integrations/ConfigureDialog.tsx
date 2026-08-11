/**
 * Connection shape — and only shape.
 *
 * There is no credential field on this form, and that is the point rather than
 * an omission. The API refuses credential-shaped keys with a 422, so a secret
 * pasted here would not reach storage; a form that appeared to accept one would
 * leave an operator believing the integration is authenticated when nothing of
 * the sort happened. The dialog says so above the fields, where it is read
 * before the typing starts rather than after.
 *
 * Saving cannot make this connection claim to be live. `connected`, `degraded`
 * and `error` describe a conversation with the provider and are set by a sync
 * that actually had one — the form has no control that could assert them.
 */

import { useT } from '../../lib/i18n'
import { useEffect, useState } from 'react'
import { KeyRound } from 'lucide-react'
import { Button, Dialog, Input, useToast } from '../../components/ui'
import type { Integration } from '../../domain/types'
import { useIntegrationAction } from '../../lib/api/mutations'
import { providerLabel } from './data'

export interface ConfigureDialogProps {
  integration: Integration
  open: boolean
  onOpenChange: (open: boolean) => void
}

function stringField(summary: Record<string, unknown>, key: string): string {
  const value = summary[key]
  return typeof value === 'string' ? value : ''
}

export function ConfigureDialog({ integration, open, onOpenChange }: ConfigureDialogProps) {
  const t = useT()
  const toast = useToast()
  const summary = integration.config_summary ?? {}

  const [displayName, setDisplayName] = useState(integration.display_name)
  const [baseUrl, setBaseUrl] = useState(() => stringField(summary, 'base_url'))
  const [accountName, setAccountName] = useState(() => stringField(summary, 'account_name'))
  const [failure, setFailure] = useState<string | null>(null)

  // A dialog reopened after a cancel must show what is stored, not the edits
  // that were abandoned.
  useEffect(() => {
    if (!open) return
    const current = integration.config_summary ?? {}
    setDisplayName(integration.display_name)
    setBaseUrl(stringField(current, 'base_url'))
    setAccountName(stringField(current, 'account_name'))
    setFailure(null)
  }, [open, integration])

  const configure = useIntegrationAction('configure', {
    onSuccess: () => {
      toast.show({
        title: t('u.configuration-stored-2'),
        description: `${providerLabel(integration.provider)} now holds this connection shape. No provider request was made.`,
        tone: 'success',
      })
      onOpenChange(false)
    },
    onError: (error) => setFailure(error.message),
  })

  function submit() {
    setFailure(null)
    configure.mutate({
      id: integration.id,
      body: {
        display_name: displayName.trim() || integration.display_name,
        base_url: baseUrl.trim(),
        account_name: accountName.trim(),
      },
    })
  }

  return (
    <Dialog
      title={`Configure ${integration.display_name}`}
      description={t('x.nonsensitive-connection-settings-stored-loca')}
      open={open}
      onOpenChange={configure.isPending ? undefined : onOpenChange}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={configure.isPending}>
            Cancel
          </Button>
          <Button variant="primary" onClick={submit} loading={configure.isPending}>
            {t('u.save-configuration')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-3 rounded-control border border-line bg-base px-3 py-2.5">
          <KeyRound
            className="mt-0.5 size-4 shrink-0 text-fg-subtle"
            aria-hidden="true"
            strokeWidth={1.75}
          />
          <p className="text-sm text-fg-muted">{t('p.no-credential-field-exists-on-this')}</p>
        </div>

        <Input
          label={t('p.display-name')}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          hint={t('p.what-this-connection-is-called-on')}
          maxLength={120}
        />
        <Input
          label={t('u.base-url')}
          type="url"
          value={baseUrl}
          onChange={(event) => setBaseUrl(event.target.value)}
          placeholder={t('p.httpsexampleinstructurecom')}
          hint={t('p.the-provider-tenant-this-connection-would')}
        />
        <Input
          label={t('p.account-name')}
          value={accountName}
          onChange={(event) => setAccountName(event.target.value)}
          hint={t('p.the-organisation-or-tenant-identifier-the')}
        />

        <p className="text-xs text-fg-subtle">
          {t('u.saving-moves-this-connection-to')}{' '}
          <span className="text-fg">{t('u.configured')}</span>
          {t('u.which-is-a-statement-about-these')}
        </p>

        {failure ? (
          <p role="alert" className="text-sm text-critical">
            {failure}
          </p>
        ) : null}
      </div>
    </Dialog>
  )
}
