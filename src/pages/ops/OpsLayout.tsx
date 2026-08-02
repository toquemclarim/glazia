import { motion } from 'framer-motion'
import { Building2, LogOut, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'

export function OpsLayout({ children }: { children: ReactNode }) {
  const { usuario, logout } = useApp()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  return (
    <div className="ops-shell">
      <aside className="ops-rail">
        <div className="ops-rail-brand">
          <img src="/logo.png" alt="Glazia" />
          <div>
            <strong>GLAZIA</strong>
            <span>Platform Ops</span>
          </div>
        </div>

        <nav className="ops-rail-nav">
          <button type="button" className="ops-rail-item active">
            <Building2 size={18} />
            Empresas
          </button>
        </nav>

        <div className="ops-rail-foot">
          <div className="ops-rail-user">
            <div className="ops-rail-avatar">
              {usuario?.nome?.charAt(0) ?? 'O'}
            </div>
            <div>
              <strong>{usuario?.nome}</strong>
              <span>PLATFORM</span>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={toggle}
            aria-label="Alternar tema"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            className="ops-rail-item"
            onClick={() => {
              logout()
              navigate('/ops/login')
            }}
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>

      <motion.main
        className="ops-main"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.main>
    </div>
  )
}
