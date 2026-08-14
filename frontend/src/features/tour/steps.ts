/**
 * The guided tour's script: what to show, in what order, and why.
 *
 * The tour follows the LOOP, not the sidebar. A tour that recites the
 * navigation teaches somebody where the buttons are; this one teaches what
 * the product does — a threat arrives, a person decides, training reaches the
 * people actually at risk, and the result changes the score. That story is
 * the only reason the screens are arranged the way they are.
 *
 * Every step names a real route and a real element. `anchor` is a CSS
 * selector that is allowed to miss: a step whose anchor is absent still
 * shows its card, because a panel that is empty on this deployment (no
 * degraded integrations, say) must not break the walkthrough. Nothing here
 * asserts a number or a state — the tour explains the SCREEN, and the screen
 * says what it measured.
 */

import type { MessageKey } from '../../lib/i18n'
import type { Permission } from '../../lib/auth/permissions'

export interface TourStep {
  id: string
  /** Route to be on before the card is shown. */
  to: string
  titleKey: MessageKey
  bodyKey: MessageKey
  /** Optional element to ring. Missing is fine — the card still shows. */
  anchor?: string
  /** Hidden entirely from roles without this permission. */
  permission?: Permission
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'command-center',
    to: '/command-center',
    titleKey: 'tour.cc.title',
    bodyKey: 'tour.cc.body',
    anchor: '[data-tour="attention"]',
    permission: 'command_center.view',
  },
  {
    id: 'threats',
    to: '/threats',
    titleKey: 'tour.intake.title',
    bodyKey: 'tour.intake.body',
    permission: 'threats.view',
  },
  {
    id: 'sandbox',
    to: '/sandbox',
    titleKey: 'tour.sandbox.title',
    bodyKey: 'tour.sandbox.body',
    permission: 'sandbox.view',
  },
  {
    id: 'incident-risks',
    to: '/incident-risks',
    titleKey: 'tour.incident.title',
    bodyKey: 'tour.incident.body',
    permission: 'incident_risks.view',
  },
  {
    id: 'approvals',
    to: '/approvals',
    titleKey: 'tour.gate.title',
    bodyKey: 'tour.gate.body',
    permission: 'approvals.view',
  },
  {
    id: 'training',
    to: '/training',
    titleKey: 'tour.training.title',
    bodyKey: 'tour.training.body',
    permission: 'training.view',
  },
  {
    id: 'policy',
    to: '/policy-intelligence',
    titleKey: 'tour.grc.title',
    bodyKey: 'tour.grc.body',
    permission: 'policy.view',
  },
  {
    id: 'people',
    to: '/employees',
    titleKey: 'tour.people.title',
    bodyKey: 'tour.people.body',
    permission: 'employees.view',
  },
  {
    id: 'cyber-ai',
    to: '/command-center',
    titleKey: 'tour.ai.title',
    bodyKey: 'tour.ai.body',
    anchor: 'button[aria-label="Cyber AI"]',
  },
]

/** The employee's tour is their own two screens, not the analyst's eight. */
export const PORTAL_TOUR_STEPS: TourStep[] = [
  {
    id: 'portal',
    to: '/portal',
    titleKey: 'tour.portal.title',
    bodyKey: 'tour.portal.body',
  },
  {
    id: 'portal-report',
    to: '/portal',
    titleKey: 'tour.report.title',
    bodyKey: 'tour.report.body',
  },
]

export const TOUR_SEEN_KEY = 'cyclowareness.tour.seen'

/** Has this browser already been walked through?
 *
 * Lives here rather than beside the component: a module that exports both a
 * component and a helper breaks fast refresh, and this is a constant's
 * neighbour, not a view's.
 */
export function tourSeen(): boolean {
  try {
    return window.localStorage.getItem(TOUR_SEEN_KEY) === '1'
  } catch {
    return true // a blocked store must not mean "offer it on every load"
  }
}
