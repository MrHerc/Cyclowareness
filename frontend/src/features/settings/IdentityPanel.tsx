/**
 * Who is signed in, and what that role may actually do.
 *
 * The identity comes from the session the server issued rather than from
 * anything chosen locally, and the surface list is generated from the same
 * navigation table the sidebar reads — so it cannot drift into promising a
 * screen this role would be bounced off. The server enforces every one of these
 * permissions independently; this panel reports them, it does not grant them.
 */

import { useT } from '../../lib/i18n'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Panel } from '../../components/ui'
import { visibleSections } from '../../app/navigation'
import { useAuth, usePermission } from '../../lib/auth/useAuth'
import { ROLE_LABEL } from '../../lib/auth/permissions'
import { num } from '../../lib/format'
import { SettingRow } from './SettingRow'

export function IdentityPanel() {
  const t = useT()
  const { session, role, can } = useAuth()
  const canSeeEmployees = usePermission('employees.view')

  if (!session) return null

  const name = session.employee_name ?? session.email
  const sections = visibleSections(can)
  const surfaceCount = sections.reduce((total, section) => total + section.items.length, 0)

  return (
    <Panel title={t('x.signed-in')} subtitle={t('x.issued-by-the-platform-when')}>
      <div className="mb-4 flex items-center gap-3">
        <Avatar name={name} size="md" />
        <div className="min-w-0">
          <p className="text-h text-fg">{name}</p>
          <p className="text-sm text-fg-subtle">{session.email}</p>
        </div>
      </div>

      <dl>
        <SettingRow
          term="Role"
          detail="Set by the platform, not by this browser. Switching roles is a real sign-in against a different account."
        >
          <Badge tone="brand" size="sm">
            {role ? ROLE_LABEL[role] : 'No role'}
          </Badge>
        </SettingRow>

        <SettingRow
          term="Linked employee record"
          detail={
            session.employee_id === null
              ? 'This account is not attached to a person in the organisation, so it has no risk score of its own.'
              : 'The person this account acts as. Their risk score moves when they complete training.'
          }
        >
          {session.employee_id === null ? (
            <span className="text-fg-faint">Not linked</span>
          ) : canSeeEmployees ? (
            <Button variant="outline" size="sm" asChild>
              <Link to={`/employees/${session.employee_id}`}>Open employee #{session.employee_id}</Link>
            </Button>
          ) : (
            <span className="tech">Employee #{session.employee_id}</span>
          )}
        </SettingRow>

        <SettingRow
          term="Surfaces you can open"
          detail={
            sections.length === 0
              ? 'This role has no analyst surfaces. Its world is the portal.'
              : sections.map((section) => section.label).join(' · ')
          }
        >
          {num(surfaceCount)} of the platform’s screens
        </SettingRow>
      </dl>
    </Panel>
  )
}
