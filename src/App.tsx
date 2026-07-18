import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { LoadingScreen } from './components/LoadingScreen'
import { AppProvider, useApp } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import { Analise } from './pages/Analise'
import { DespesasFixas } from './pages/DespesasFixas'
import { Lancamentos } from './pages/Lancamentos'
import { Login } from './pages/Login'
import type { ReactNode } from 'react'
///// functions
function PrivateRoute({ children }: { children: ReactNode }) {
  const { usuario } = useApp()
  if (!usuario) return <Navigate to="/login" replace />
  return <Layout>{children}</Layout>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { usuario } = useApp()
  if (usuario) return <Navigate to="/analise" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <>
      <LoadingScreen />
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />
        <Route
          path="/analise"
          element={
            <PrivateRoute>
              <Analise />
            </PrivateRoute>
          }
        />
        <Route
          path="/lancamentos"
          element={
            <PrivateRoute>
              <Lancamentos />
            </PrivateRoute>
          }
        />
        <Route
          path="/despesas"
          element={
            <PrivateRoute>
              <DespesasFixas />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/analise" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  )
}
