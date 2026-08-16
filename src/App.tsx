import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { EmpresaInativaModal } from './components/EmpresaInativaModal'
import { Layout } from './components/Layout'
import { LoadingScreen } from './components/LoadingScreen'
import { AppProvider, useApp } from './context/AppContext'
import { ThemeProvider } from './context/ThemeContext'
import { TourProvider } from './tour/TourContext'
import { Analise } from './pages/Analise'
import { AnaliseVendas } from './pages/AnaliseVendas'
import { Clientes } from './pages/Clientes'
import { Conta } from './pages/Conta'
import { CriarConta } from './pages/CriarConta'
import { DespesasFixas } from './pages/DespesasFixas'
import { Equipe } from './pages/Equipe'
import { Home } from './pages/Home'
import { Lancamentos } from './pages/Lancamentos'
import { BoasVindas } from './pages/BoasVindas'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { PrimeiroAcesso } from './pages/PrimeiroAcesso'
import { OpsEmpresas } from './pages/ops/OpsEmpresas'
import { OpsLayout } from './pages/ops/OpsLayout'
import { OpsLogin } from './pages/ops/OpsLogin'
import {
  hasQueuedWelcome,
  hasSeenWelcome,
} from './utils/welcome'

function PrivateRoute({
  children,
  allow,
}: {
  children: ReactNode
  allow?: boolean
}) {
  const { usuario, bootstrapping, isPlatform, empresaBloqueada } = useApp()
  if (bootstrapping) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (isPlatform) return <Navigate to="/ops" replace />
  if (empresaBloqueada) {
    return <EmpresaInativaModal />
  }
  if (usuario.deveTrocarSenha) {
    return <Navigate to="/primeiro-acesso" replace />
  }
  if (hasQueuedWelcome() && !hasSeenWelcome(usuario.id)) {
    return <Navigate to="/boas-vindas" replace />
  }
  if (allow === false) return <Navigate to="/home" replace />
  return <Layout>{children}</Layout>
}

function PrimeiroAcessoRoute() {
  const { usuario, bootstrapping, isPlatform, empresaBloqueada } = useApp()
  if (bootstrapping) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (isPlatform) return <Navigate to="/ops" replace />
  if (empresaBloqueada) return <EmpresaInativaModal />
  if (!usuario.deveTrocarSenha) {
    if (hasQueuedWelcome()) return <Navigate to="/boas-vindas" replace />
    return <Navigate to="/home" replace />
  }
  return <PrimeiroAcesso />
}

function BoasVindasRoute() {
  const { usuario, bootstrapping, isPlatform, empresaBloqueada } = useApp()
  if (bootstrapping) return null
  if (!usuario) return <Navigate to="/login" replace />
  if (isPlatform) return <Navigate to="/ops" replace />
  if (empresaBloqueada) return <EmpresaInativaModal />
  if (usuario.deveTrocarSenha) {
    return <Navigate to="/primeiro-acesso" replace />
  }
  if (!hasQueuedWelcome() && hasSeenWelcome(usuario.id)) {
    return <Navigate to="/home" replace />
  }
  return <BoasVindas />
}

function OpsRoute({ children }: { children: ReactNode }) {
  const { usuario, bootstrapping, isPlatform } = useApp()
  if (bootstrapping) return null
  if (!usuario) return <Navigate to="/ops/login" replace />
  if (!isPlatform) return <Navigate to="/home" replace />
  return <OpsLayout>{children}</OpsLayout>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { usuario, bootstrapping, isPlatform, empresaBloqueada } = useApp()
  if (bootstrapping) return null
  if (usuario) {
    if (isPlatform) return <Navigate to="/ops" replace />
    if (empresaBloqueada) return <EmpresaInativaModal />
    if (usuario.deveTrocarSenha) {
      return <Navigate to="/primeiro-acesso" replace />
    }
    return <Navigate to="/home" replace />
  }
  return <>{children}</>
}

function AppRoutes() {
  const {
    podeOperar,
    podeAnalisar,
    podeGestaoFinanceira,
    podeGestaoEquipe,
  } = useApp()

  return (
    <>
      <LoadingScreen />
      <Routes>
        <Route
          path="/"
          element={
            <PublicOnly>
              <Landing />
            </PublicOnly>
          }
        />
        <Route
          path="/criar-conta"
          element={
            <PublicOnly>
              <CriarConta />
            </PublicOnly>
          }
        />
        <Route
          path="/login"
          element={
            <PublicOnly>
              <Login />
            </PublicOnly>
          }
        />
        <Route path="/primeiro-acesso" element={<PrimeiroAcessoRoute />} />
        <Route path="/boas-vindas" element={<BoasVindasRoute />} />
        <Route
          path="/ops/login"
          element={
            <PublicOnly>
              <OpsLogin />
            </PublicOnly>
          }
        />
        <Route
          path="/ops"
          element={
            <OpsRoute>
              <OpsEmpresas />
            </OpsRoute>
          }
        />
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/analise"
          element={
            <PrivateRoute allow={podeAnalisar}>
              <Analise />
            </PrivateRoute>
          }
        />
        <Route
          path="/analise-vendas"
          element={
            <PrivateRoute allow={podeAnalisar || podeOperar}>
              <AnaliseVendas />
            </PrivateRoute>
          }
        />
        <Route
          path="/lancamentos"
          element={
            <PrivateRoute allow={podeOperar}>
              <Lancamentos />
            </PrivateRoute>
          }
        />
        <Route
          path="/conta"
          element={
            <PrivateRoute>
              <Conta />
            </PrivateRoute>
          }
        />
        <Route
          path="/equipe"
          element={
            <PrivateRoute allow={podeGestaoEquipe}>
              <Equipe />
            </PrivateRoute>
          }
        />
        <Route
          path="/despesas"
          element={
            <PrivateRoute allow={podeGestaoFinanceira}>
              <DespesasFixas />
            </PrivateRoute>
          }
        />
        <Route
          path="/clientes"
          element={
            <PrivateRoute allow={podeOperar}>
              <Clientes />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AppProvider>
        <BrowserRouter>
          <TourProvider>
            <AppRoutes />
          </TourProvider>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  )
}
