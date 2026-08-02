import { motion } from 'framer-motion'
import { ArrowRight, Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { useTheme } from '../../context/ThemeContext'

export function OpsLogin() {
  const { login, error: authError, loading, usuario, bootstrapping } = useApp()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')

  if (!bootstrapping && usuario?.cargo === 'PLATFORM') {
    return <Navigate to="/ops" replace />
  }

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')
    if (!email.trim() || !senha) {
      setErro('Informe e-mail e senha.')
      return
    }
    const user = await login(email.trim(), senha)
    if (!user) return
    if (user.cargo !== 'PLATFORM') {
      setErro('Este acesso não é do painel Ops. Use o login do cliente.')
      return
    }
    navigate('/ops', { replace: true })
  }

  return (
    <div className="ops-login">
      <button
        type="button"
        className="btn-icon ops-login-theme"
        onClick={toggle}
        aria-label="Alternar tema"
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <motion.div
        className="ops-login-panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="ops-kicker">Glazia Platform</p>
        <h1 className="ops-display">Ops Console</h1>
        <p className="ops-login-sub">
          Console interno para provisionar empresas, planos e acesso dos
          clientes Glazia.
        </p>

        <form className="ops-login-form" onSubmit={(e) => void onSubmit(e)}>
          <div className="field">
            <label htmlFor="ops-email">E-mail Ops</label>
            <input
              id="ops-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ops@glazia.com.br"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="ops-senha">Senha</label>
            <input
              id="ops-senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </div>
          {(erro || authError) && (
            <p className="lanc-error">{erro || authError}</p>
          )}
          <button
            type="submit"
            className="btn btn-accent ops-login-cta"
            disabled={loading}
          >
            {loading ? 'Entrando…' : 'Entrar no Ops'}
            <ArrowRight size={18} />
          </button>
        </form>

        <Link to="/login" className="ops-login-back">
          ← Voltar ao app do cliente
        </Link>
      </motion.div>

      <div className="ops-login-aside" aria-hidden>
        <motion.div
          className="ops-login-orb"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
        />
        <p>Multi-tenant · assinaturas · suporte</p>
      </div>
    </div>
  )
}
