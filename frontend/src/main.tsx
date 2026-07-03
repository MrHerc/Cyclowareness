import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AuthProvider, homeFor, useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { AnalystDashboard } from './pages/analyst/Dashboard'
import { LoopRunPage } from './pages/analyst/LoopRunPage'
import { TriageQueue } from './pages/analyst/TriageQueue'
import { TrainingReview } from './pages/analyst/TrainingReview'
import { EmployeesPage } from './pages/analyst/EmployeesPage'
import { SimulationsPage } from './pages/analyst/SimulationsPage'
import { FeedPage } from './pages/analyst/FeedPage'
import { EmployeePortal } from './pages/employee/EmployeePortal'
import { TakeTraining } from './pages/employee/TakeTraining'
import { ExecutivePage } from './pages/executive/ExecutivePage'

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
