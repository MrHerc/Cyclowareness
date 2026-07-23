import { lazy, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider, homeFor, useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'

// Route-level code-splitting: the charting-heavy analyst/exec pages load on
// demand, keeping the initial bundle (and login) lean.
const AnalystDashboard = lazy(() => import('./pages/analyst/Dashboard').then((m) => ({ default: m.AnalystDashboard })))
const LoopRunPage = lazy(() => import('./pages/analyst/LoopRunPage').then((m) => ({ default: m.LoopRunPage })))
const TriageQueue = lazy(() => import('./pages/analyst/TriageQueue').then((m) => ({ default: m.TriageQueue })))
const TrainingReview = lazy(() => import('./pages/analyst/TrainingReview').then((m) => ({ default: m.TrainingReview })))
const EmployeesPage = lazy(() => import('./pages/analyst/EmployeesPage').then((m) => ({ default: m.EmployeesPage })))
const SimulationsPage = lazy(() => import('./pages/analyst/SimulationsPage').then((m) => ({ default: m.SimulationsPage })))
const FeedPage = lazy(() => import('./pages/analyst/FeedPage').then((m) => ({ default: m.FeedPage })))
const SandboxPage = lazy(() => import('./pages/analyst/SandboxPage').then((m) => ({ default: m.SandboxPage })))
const SandboxJobPage = lazy(() => import('./pages/analyst/SandboxJobPage').then((m) => ({ default: m.SandboxJobPage })))
const EmployeePortal = lazy(() => import('./pages/employee/EmployeePortal').then((m) => ({ default: m.EmployeePortal })))
const TakeTraining = lazy(() => import('./pages/employee/TakeTraining').then((m) => ({ default: m.TakeTraining })))
const ExecutivePage = lazy(() => import('./pages/executive/ExecutivePage').then((m) => ({ default: m.ExecutivePage })))

function RequireRole({ roles, children }: { roles: string[]; children: React.ReactElement }) {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  if (!roles.includes(session.role)) return <Navigate to={homeFor(session.role)} replace />
  return children
}

function Root() {
  const { session } = useAuth()
  if (!session) return <Navigate to="/login" replace />
  return <Navigate to={homeFor(session.role)} replace />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route
              path="/"
              element={
                <RequireRole roles={['analyst']}>
                  <AnalystDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/loop/:id"
              element={
                <RequireRole roles={['analyst']}>
                  <LoopRunPage />
                </RequireRole>
              }
            />
            <Route
              path="/reports"
              element={
                <RequireRole roles={['analyst']}>
                  <TriageQueue />
                </RequireRole>
              }
            />
            <Route
              path="/training"
              element={
                <RequireRole roles={['analyst']}>
                  <TrainingReview />
                </RequireRole>
              }
            />
            <Route
              path="/employees"
              element={
                <RequireRole roles={['analyst']}>
                  <EmployeesPage />
                </RequireRole>
              }
            />
            <Route
              path="/simulations"
              element={
                <RequireRole roles={['analyst']}>
                  <SimulationsPage />
                </RequireRole>
              }
            />
            <Route
              path="/feed"
              element={
                <RequireRole roles={['analyst']}>
                  <FeedPage />
                </RequireRole>
              }
            />
            <Route
              path="/sandbox"
              element={
                <RequireRole roles={['analyst']}>
                  <SandboxPage />
                </RequireRole>
              }
            />
            <Route
              path="/sandbox/:id"
              element={
                <RequireRole roles={['analyst']}>
                  <SandboxJobPage />
                </RequireRole>
              }
            />
            <Route
              path="/me"
              element={
                <RequireRole roles={['employee', 'analyst']}>
                  <EmployeePortal />
                </RequireRole>
              }
            />
            <Route
              path="/learn/:id"
              element={
                <RequireRole roles={['employee', 'analyst']}>
                  <TakeTraining />
                </RequireRole>
              }
            />
            <Route
              path="/exec"
              element={
                <RequireRole roles={['executive', 'analyst']}>
                  <ExecutivePage />
                </RequireRole>
              }
            />
          </Route>
          <Route path="*" element={<Root />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
)
