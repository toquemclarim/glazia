import { Loader2, Lock } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { useApp } from '../context/AppContext'
import { alterarSenhaConta } from '../services/api'
import { queueWelcomeScreen } from '../utils/welcome'

export function PrimeiroAcesso() {
  const { usuario, aplicarSessao, logout } = useApp()
  const navigate = useNavigate()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)

    if (senhaNova.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres')
      return
    }
    if (senhaNova !== confirmarSenha) {
      setErro('A confirmação da senha não confere')
      return
    }
    if (senhaNova === senhaAtual) {
      setErro('A nova senha deve ser diferente da senha temporária')
      return
    }

    setSalvando(true)
    try {
      const res = await alterarSenhaConta({
        senhaAtual,
        senhaNova,
        confirmarSenha,
      })
      aplicarSessao(res.accessToken, {
        ...res.usuario,
        deveTrocarSenha: false,
      })
      queueWelcomeScreen()
      navigate('/boas-vindas', { replace: true })
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível alterar a senha',
      )
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="login-page">
      <div className="glass login-card fade-up">
        <div className="login-logo">
          <BrandLogo variant="full" size="auth" />
          <p>Primeiro acesso</p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: '0.65rem',
            alignItems: 'flex-start',
            marginBottom: '1.1rem',
            color: 'var(--text-muted)',
            fontSize: '0.92rem',
            lineHeight: 1.45,
          }}
        >
          <Lock size={18} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0 }}>
            Olá{usuario?.nome ? `, ${usuario.nome.split(' ')[0]}` : ''}. Por
            segurança, defina sua própria senha antes de usar o Glazia. A senha
            temporária deixa de valer após esta etapa.
          </p>
        </div>

        <form className="login-form" onSubmit={(e) => void salvar(e)}>
          <div className="field">
            <label htmlFor="pa-atual">Senha temporária</label>
            <input
              id="pa-atual"
              type="password"
              autoComplete="current-password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="pa-nova">Nova senha</label>
            <input
              id="pa-nova"
              type="password"
              autoComplete="new-password"
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="field">
            <label htmlFor="pa-confirma">Confirmar nova senha</label>
            <input
              id="pa-confirma"
              type="password"
              autoComplete="new-password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {erro && (
            <p
              role="alert"
              style={{ color: 'var(--danger)', fontSize: '0.85rem' }}
            >
              {erro}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-accent"
            disabled={salvando}
            style={{ width: '100%' }}
          >
            {salvando ? (
              <>
                <Loader2 className="spin" size={16} /> Salvando…
              </>
            ) : (
              'Definir senha e continuar'
            )}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: '0.75rem' }}
          onClick={() => {
            logout()
            navigate('/login', { replace: true })
          }}
        >
          Sair
        </button>
      </div>
    </div>
  )
}
