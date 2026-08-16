import {
  BarChart3,
  House,
  LogOut,
  Menu,
  Moon,
  PlusCircle,
  Receipt,
  ScanSearch,
  Settings,
  Sun,
  UserCog,
  Users,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { onTourAction } from '../tour/events'
import { AiChat } from './AiChat'
import { BrandLogo } from './BrandLogo'
import { GuidedTour } from './GuidedTour'
import { TrialBanner } from './TrialBanner'

const TITLES: Record<string, string> = {
  '/home': 'Início',
  '/analise': 'Análise financeira',
  '/analise-vendas': 'Análise de vendas',
  '/lancamentos': 'Lançamentos',
  '/despesas': 'Despesas fixas',
  '/clientes': 'Clientes',
  '/equipe': 'Equipe',
  '/conta': 'Configurações da conta',
}

const NAV_TOUR: Record<string, string> = {
  '/home': 'nav-home',
  '/analise': 'nav-analise',
  '/analise-vendas': 'nav-analise-vendas',
  '/lancamentos': 'nav-lancamentos',
  '/despesas': 'nav-despesas',
  '/clientes': 'nav-clientes',
  '/equipe': 'nav-equipe',
}

export function Layout({ children }: { children: ReactNode }) {
  const {
    usuario,
    logout,
    navigateWithLoading,
    podeOperar,
    podeAnalisar,
    podeGestaoFinanceira,
    podeGestaoEquipe,
  } = useApp()
  const { theme, toggle } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const nav = useMemo(() => {
    const items = [{ path: '/home', label: 'Início', icon: House }]
    if (podeAnalisar) {
      items.push({ path: '/analise', label: 'Análise', icon: BarChart3 })
    }
    if (podeAnalisar || podeOperar) {
      items.push({
        path: '/analise-vendas',
        label: 'Análise de vendas',
        icon: ScanSearch,
      })
    }
    if (podeOperar) {
      items.push(
        { path: '/lancamentos', label: 'Lançamentos', icon: PlusCircle },
        { path: '/clientes', label: 'Clientes', icon: Users },
      )
    }
    if (podeGestaoFinanceira) {
      items.push({
        path: '/despesas',
        label: 'Despesas fixas',
        icon: Receipt,
      })
    }
    if (podeGestaoEquipe) {
      items.push({ path: '/equipe', label: 'Equipe', icon: UserCog })
    }
    return items
  }, [podeOperar, podeAnalisar, podeGestaoFinanceira, podeGestaoEquipe])

  useEffect(() => {
    return onTourAction((action) => {
      if (action === 'open-sidebar') setMenuOpen(true)
      if (action === 'close-sidebar') setMenuOpen(false)
    })
  }, [])

  const go = (path: string) => {
    if (path === location.pathname) {
      setMenuOpen(false)
      return
    }
    setMenuOpen(false)
    navigateWithLoading(() => navigate(path))
  }

  const handleLogout = () => {
    navigateWithLoading(() => {
      logout()
      navigate('/login')
    })
  }

  return (
    <div className="app-shell">
      <div
        className={`sidebar-overlay${menuOpen ? ' visible' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`sidebar${menuOpen ? ' open' : ''}`}>
        <div className="sidebar-brand">
          <BrandLogo variant="full" size="sidebar" />
          <div className="sidebar-brand-meta">
            <span>Analytics</span>
          </div>
          <button
            className="btn-icon"
            style={{ marginLeft: 'auto', display: 'none' }}
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
            id="close-mobile-menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="nav-list">
          {nav.map(({ path, label, icon: Icon }) => (
            <button
              key={path}
              data-tour={NAV_TOUR[path]}
              className={`nav-item${location.pathname === path ? ' active' : ''}`}
              onClick={() => go(path)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-chip" style={{ padding: '0.35rem 0.5rem' }}>
            <div className="user-avatar">
              {usuario?.nome?.charAt(0) ?? 'U'}
            </div>
            <div>
              <div style={{ color: 'var(--text)', fontWeight: 600 }}>
                {usuario?.nome}
              </div>
              <div style={{ fontSize: '0.72rem' }}>
                {usuario?.cargo} · {usuario?.email}
              </div>
            </div>
          </div>
          <div className="sidebar-footer-actions">
            <button
              data-tour="nav-config"
              className={`nav-item nav-item-quiet${location.pathname === '/conta' ? ' active' : ''}`}
              onClick={() => go('/conta')}
              title="Configurações da conta"
              aria-label="Configurações da conta"
            >
              <Settings size={16} />
              Configurações
            </button>
            <button className="nav-item" onClick={handleLogout}>
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </aside>

      <div className="main-area">
        <TrialBanner />
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="menu-btn"
              onClick={() => setMenuOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <BrandLogo
              variant="mark"
              size="mark"
              className="mobile-logo"
            />
            <h1>{TITLES[location.pathname] ?? 'Início'}</h1>
          </div>
          <div className="topbar-actions">
            <button
              className="btn-icon"
              onClick={toggle}
              aria-label="Alternar tema"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>
        <main className="page-content">{children}</main>
      </div>
      <GuidedTour />
      {podeAnalisar && <AiChat />}
    </div>
  )
}
