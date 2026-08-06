/**
 * The lazy page map.
 *
 * Split from `routes.tsx` so the route table contains only the table. It also
 * keeps the one contract every page author needs in a single readable list:
 * **each module in `src/pages/` must `export default` its page component.**
 * `React.lazy` resolves nothing else, and a named-only export fails at runtime
 * in the browser rather than at build time, which is the worst place to find it.
 */

import { lazy } from 'react'

/* --- public ------------------------------------------------------------- */
export const Login = lazy(() => import('../pages/Login'))
export const AdminEntry = lazy(() => import('../pages/AdminEntry'))
export const Register = lazy(() => import('../pages/Register'))
export const ForgotPassword = lazy(() => import('../pages/ForgotPassword'))

/* --- first run ----------------------------------------------------------- */
export const Onboarding = lazy(() => import('../pages/Onboarding'))

/* --- operate ------------------------------------------------------------- */
export const CommandCenter = lazy(() => import('../pages/CommandCenter'))
export const Loops = lazy(() => import('../pages/Loops'))
export const LoopDetail = lazy(() => import('../pages/LoopDetail'))
export const Threats = lazy(() => import('../pages/Threats'))
export const ThreatDetail = lazy(() => import('../pages/ThreatDetail'))
export const Approvals = lazy(() => import('../pages/Approvals'))
export const ApprovalDetail = lazy(() => import('../pages/ApprovalDetail'))

/* --- programme ----------------------------------------------------------- */
export const Simulations = lazy(() => import('../pages/Simulations'))
export const SimulationDetail = lazy(() => import('../pages/SimulationDetail'))
export const Training = lazy(() => import('../pages/Training'))
export const TrainingDetail = lazy(() => import('../pages/TrainingDetail'))
export const Sandbox = lazy(() => import('../pages/Sandbox'))
export const SandboxDetail = lazy(() => import('../pages/SandboxDetail'))

/* --- people and risk ----------------------------------------------------- */
export const Employees = lazy(() => import('../pages/Employees'))
export const EmployeeDetail = lazy(() => import('../pages/EmployeeDetail'))
export const Departments = lazy(() => import('../pages/Departments'))
export const RiskProfiles = lazy(() => import('../pages/RiskProfiles'))
export const IncidentRisks = lazy(() => import('../pages/IncidentRisks'))
export const Remediation = lazy(() => import('../pages/Remediation'))
export const IncidentRiskDetail = lazy(() => import('../pages/IncidentRiskDetail'))

/* --- governance ---------------------------------------------------------- */
export const PolicyIntelligence = lazy(() => import('../pages/PolicyIntelligence'))
export const Policies = lazy(() => import('../pages/Policies'))
export const PolicyFindings = lazy(() => import('../pages/PolicyFindings'))
export const PolicyFindingDetail = lazy(() => import('../pages/PolicyFindingDetail'))
export const ThreatIntelligence = lazy(() => import('../pages/ThreatIntelligence'))
export const Reports = lazy(() => import('../pages/Reports'))
export const Integrations = lazy(() => import('../pages/Integrations'))
export const AuditLog = lazy(() => import('../pages/AuditLog'))
export const Settings = lazy(() => import('../pages/Settings'))

/* --- leadership and the employee ----------------------------------------- */
export const Executive = lazy(() => import('../pages/Executive'))
export const Portal = lazy(() => import('../pages/Portal'))
export const PortalTraining = lazy(() => import('../pages/PortalTraining'))

/* --- fallback ------------------------------------------------------------- */
export const NotFound = lazy(() => import('../pages/NotFound'))
