/**
 * Every URL the application answers.
 *
 * Four rules this file enforces.
 *
 * 1. **Every page module is lazy and default-exported.** Pages in this product
 *    are large and role-specific; an executive should not download the sandbox
 *    report viewer to read one posture screen. The module map lives in
 *    `pages.ts`, and the default-export contract is documented there.
 *
 * 2. **Every guarded route names its permission, and it is the same permission
 *    the navigation table names.** `RequirePermission` sends a user who lacks it
 *    to `homeFor(role)` rather than to a dead end. The server enforces the same
 *    check independently — the guard here only stops the UI offering a request
 *    that would come back 403.
 *
 * 3. **The shell is a layout route.** Everything authenticated renders inside
 *    one `AppShell` instance, so navigating between pages does not remount the
 *    navigation, reset its scroll position, or re-run the shell's queries.
 *
 * 4. **`*` lives inside the shell.** A signed-in user who mistypes a URL keeps
 *    their navigation and can leave; an anonymous one is redirected to sign in
 *    by the same guard that protects every other route.
 */

import { Suspense, type ReactElement } from 'react'
import { Outlet, type RouteObject } from 'react-router-dom'
import { AppShell } from '../components/shell/AppShell'
import { PageFallback } from '../components/shell/PageFallback'
import { RouteErrorBoundary } from '../components/states'
import { RedirectIfAuthenticated, RequireAuth, RequirePermission } from '../lib/auth/guards'
import type { Permission } from '../lib/auth/permissions'
import { RootRedirect } from './RootRedirect'
import * as Page from './pages'

/**
 * Wraps a lazy page in its own Suspense boundary.
 *
 * Per route rather than once around the outlet: a single boundary higher up
 * would unmount the page currently on screen the moment a link is clicked, so
 * every navigation would flash a skeleton over content that was already there.
 */
function page(node: ReactElement): ReactElement {
  return <Suspense fallback={<PageFallback />}>{node}</Suspense>
}

function guarded(permission: Permission, node: ReactElement): ReactElement {
  return page(<RequirePermission permission={permission}>{node}</RequirePermission>)
}

/**
 * The table itself, as plain data.
 *
 * The router is built from it in `App.tsx` rather than here, so importing this
 * module does not touch `window` — which is what lets the whole tree be
 * rendered headlessly, and what stops a route table from being something you
 * can only exercise by opening a browser.
 */
export const routes: RouteObject[] = [
  {
    // A pathless root exists so one `errorElement` covers every branch,
    // including the public ones.
    element: <Outlet />,
    errorElement: <RouteErrorBoundary />,
    children: [
      /* --- public ---------------------------------------------------------- */
      {
        path: '/login',
        element: page(
          <RedirectIfAuthenticated>
            <Page.Login />
          </RedirectIfAuthenticated>,
        ),
      },
      {
        // NOT wrapped in `RedirectIfAuthenticated`. That guard bounced anyone
        // with a session before the page rendered, which reads as "there is no
        // admin page" — the exact complaint. `AdminEntry` decides by WHO you
        // are: the door when signed out, the console when you are the analyst.
        path: '/admin',
        element: page(<Page.AdminEntry />),
      },
      {
        path: '/register',
        element: page(
          <RedirectIfAuthenticated>
            <Page.Register />
          </RedirectIfAuthenticated>,
        ),
      },
      {
        path: '/forgot-password',
        element: page(
          <RedirectIfAuthenticated>
            <Page.ForgotPassword />
          </RedirectIfAuthenticated>,
        ),
      },

      /* --- onboarding: authenticated, but deliberately outside the shell ----
         It is a first-run flow. Showing the full navigation behind it invites
         someone to skip the setup they are being asked to complete. */
      {
        path: '/onboarding',
        element: page(
          <RequireAuth>
            <Page.Onboarding />
          </RequireAuth>,
        ),
      },

      /* --- the application ------------------------------------------------- */
      {
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <RootRedirect /> },

          /* operate */
          {
            path: 'command-center',
            element: guarded('command_center.view', <Page.CommandCenter />),
          },
          { path: 'loops', element: guarded('loops.view', <Page.Loops />) },
          { path: 'loops/:id', element: guarded('loops.view', <Page.LoopDetail />) },
          { path: 'threats', element: guarded('threats.view', <Page.Threats />) },
          { path: 'threats/:id', element: guarded('threats.view', <Page.ThreatDetail />) },
          { path: 'approvals', element: guarded('approvals.view', <Page.Approvals />) },
          { path: 'approvals/:id', element: guarded('approvals.view', <Page.ApprovalDetail />) },

          /* programme */
          { path: 'simulations', element: guarded('simulations.view', <Page.Simulations />) },
          {
            path: 'simulations/:id',
            element: guarded('simulations.view', <Page.SimulationDetail />),
          },
          { path: 'training', element: guarded('training.view', <Page.Training />) },
          { path: 'training/:id', element: guarded('training.view', <Page.TrainingDetail />) },
          { path: 'sandbox', element: guarded('sandbox.view', <Page.Sandbox />) },
          { path: 'sandbox/:id', element: guarded('sandbox.view', <Page.SandboxDetail />) },

          /* people and risk */
          { path: 'employees', element: guarded('employees.view', <Page.Employees />) },
          { path: 'employees/:id', element: guarded('employees.view', <Page.EmployeeDetail />) },
          { path: 'departments', element: guarded('departments.view', <Page.Departments />) },
          { path: 'risk-profiles', element: guarded('risk.view', <Page.RiskProfiles />) },
          { path: 'remediation', element: guarded('remediation.view', <Page.Remediation />) },
          {
            path: 'incident-risks',
            element: guarded('incident_risks.view', <Page.IncidentRisks />),
          },
          {
            path: 'incident-risks/:id',
            element: guarded('incident_risks.view', <Page.IncidentRiskDetail />),
          },

          /* governance */
          {
            path: 'policy-intelligence',
            element: guarded('policy.view', <Page.PolicyIntelligence />),
          },
          {
            path: 'policy-intelligence/policies',
            element: guarded('policy.view', <Page.Policies />),
          },
          {
            path: 'policy-intelligence/findings',
            element: guarded('policy.view', <Page.PolicyFindings />),
          },
          {
            path: 'policy-intelligence/findings/:id',
            element: guarded('policy.view', <Page.PolicyFindingDetail />),
          },
          {
            path: 'threat-intelligence',
            element: guarded('intel.view', <Page.ThreatIntelligence />),
          },
          { path: 'reports', element: guarded('reports.view', <Page.Reports />) },
          { path: 'integrations', element: guarded('integrations.view', <Page.Integrations />) },
          { path: 'audit-log', element: guarded('audit.view', <Page.AuditLog />) },

          /* Settings carries no permission of its own in the matrix — every
             signed-in role has an account to manage. Anything privileged inside
             it has to gate itself. */
          { path: 'settings', element: page(<Page.Settings />) },

          /* leadership */
          { path: 'executive', element: guarded('executive.view', <Page.Executive />) },

          /* the employee's world */
          { path: 'portal', element: guarded('portal.view', <Page.Portal />) },
          {
            path: 'portal/training/:id',
            element: guarded('portal.view', <Page.PortalTraining />),
          },

          { path: '*', element: page(<Page.NotFound />) },
        ],
      },
    ],
  },
]
