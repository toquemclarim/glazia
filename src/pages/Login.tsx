import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Moon, Sun } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'

export function Login() {
  const { login, error: authError, loading } = useApp()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setErro('')
    if (!email.trim()) {
      setErro('Informe o e-mail.')
      return
    }
    if (!senha) {
      setErro('Informe a senha.')
      return
    }
    const user = await login(email.trim(), senha)
    if (!user) return
    if (user.cargo === 'PLATFORM') {
      navigate('/ops')
      return
    }
    if (user.empresaBloqueada) {
      navigate('/home', { replace: true })
      return
    }
    navigate(user.deveTrocarSenha ? '/primeiro-acesso' : '/home')
  }

  return (
    <div className="login-page">
      <button
        className="btn-icon"
        onClick={toggle}
        aria-label="Alternar tema"
        style={{
          position: 'absolute',
          top: '1.25rem',
          right: '1.25rem',
          zIndex: 2,
        }}
      >
        {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <div className="glass login-card fade-up">
        <div className="login-logo">
          <img src="/logo-full.png" alt="Glazia" />
          <p>
            Controle financeiro
            <br />
            esquadrias &amp; vidraçaria
          </p>
        </div>

        <form className="login-form" onSubmit={(e) => void handleSubmit(e)}>
          <div className="field">
            <label htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="senha">Senha</label>
            <div className="conta-password-wrap">
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="conta-password-toggle"
                onClick={() => setMostrarSenha((v) => !v)}
                aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                title={mostrarSenha ? 'Ocultar' : 'Mostrar'}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {(erro || authError) && (
            <p style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>
              {erro || authError}
            </p>
          )}
          <button
            type="submit"
            className="btn btn-accent"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="login-hint">
          Ainda não tem conta?{' '}
          <Link to="/criar-conta">Criar conta gratuitamente</Link>
        </p>
      </div>
    </div>
  )
}
