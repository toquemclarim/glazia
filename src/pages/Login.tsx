import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun } from 'lucide-react'

export function Login() {
  const { login, error: authError } = useApp()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('admin@glazia.com.br')
  const [senha, setSenha] = useState('demo123')
  const [erro, setErro] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (!email.trim()) {
      setErro('Informe o e-mail.')
      return
    }
    const ok = await login(email.trim(), senha)
    if (ok) navigate('/analise')
  }

  return (
    <div className="login-page">
      <button
        className="btn-icon"
        onClick={toggle}
        aria-label="Alternar tema"
        style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 2 }}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="glass login-card fade-up">
        <div className="login-logo">
          <img src="/logo-full.png" alt="Glazia" />
          <p>Controle financeiro<br />esquadrias &amp; vidraçaria</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {(erro || authError) && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
              {erro || authError}
            </p>
          )}
          <button type="submit" className="btn btn-accent" style={{ width: '100%', marginTop: '0.5rem' }}>
            Entrar
          </button>
        </form>
        <p className="login-hint">Acesso seguro por Supabase Auth</p>
      </div>
    </div>
  )
}
