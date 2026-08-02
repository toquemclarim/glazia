import { Check, Eye, EyeOff, Loader2, Lock, Mail, Shield } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { alterarEmailConta, alterarSenhaConta } from '../services/api'
import { useApp } from '../context/AppContext'

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  visible,
  onToggleVisible,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  autoComplete: string
  visible: boolean
  onToggleVisible: () => void
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="conta-password-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
        />
        <button
          type="button"
          className="conta-password-toggle"
          onClick={onToggleVisible}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          title={visible ? 'Ocultar' : 'Mostrar'}
        >
          {visible ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

export function Conta() {
  const { usuario, aplicarSessao } = useApp()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showAtual, setShowAtual] = useState(false)
  const [showNova, setShowNova] = useState(false)
  const [showConfirma, setShowConfirma] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [okSenha, setOkSenha] = useState<string | null>(null)
  const [erroSenha, setErroSenha] = useState<string | null>(null)

  const [novoEmail, setNovoEmail] = useState(usuario?.email ?? '')
  const [senhaEmail, setSenhaEmail] = useState('')
  const [showSenhaEmail, setShowSenhaEmail] = useState(false)
  const [salvandoEmail, setSalvandoEmail] = useState(false)
  const [okEmail, setOkEmail] = useState<string | null>(null)
  const [erroEmail, setErroEmail] = useState<string | null>(null)

  useEffect(() => {
    if (usuario?.email) setNovoEmail(usuario.email)
  }, [usuario?.email])

  const salvarSenha = async (e: FormEvent) => {
    e.preventDefault()
    setErroSenha(null)
    setOkSenha(null)

    if (senhaNova !== confirmarSenha) {
      setErroSenha('A confirmação da senha não confere')
      return
    }
    if (senhaNova.length < 6) {
      setErroSenha('A nova senha deve ter pelo menos 6 caracteres')
      return
    }

    setSalvandoSenha(true)
    try {
      const res = await alterarSenhaConta({
        senhaAtual,
        senhaNova,
        confirmarSenha,
      })
      aplicarSessao(res.accessToken, res.usuario)
      setOkSenha(res.mensagem)
      setSenhaAtual('')
      setSenhaNova('')
      setConfirmarSenha('')
    } catch (cause) {
      setErroSenha(
        cause instanceof Error ? cause.message : 'Não foi possível alterar a senha',
      )
    } finally {
      setSalvandoSenha(false)
    }
  }

  const salvarEmail = async (e: FormEvent) => {
    e.preventDefault()
    setErroEmail(null)
    setOkEmail(null)

    const email = novoEmail.trim().toLowerCase()
    if (!email.includes('@')) {
      setErroEmail('Informe um e-mail válido')
      return
    }
    if (email === usuario?.email?.toLowerCase()) {
      setErroEmail('Informe um e-mail diferente do atual')
      return
    }

    setSalvandoEmail(true)
    try {
      const res = await alterarEmailConta({
        novoEmail: email,
        senhaAtual: senhaEmail,
      })
      aplicarSessao(res.accessToken, res.usuario)
      setOkEmail('E-mail de login/recuperação atualizado')
      setSenhaEmail('')
      setNovoEmail(res.usuario.email)
    } catch (cause) {
      setErroEmail(
        cause instanceof Error ? cause.message : 'Não foi possível alterar o e-mail',
      )
    } finally {
      setSalvandoEmail(false)
    }
  }

  return (
    <div className="conta-page">
      <header className="conta-intro fade-up">
        <p className="section-title" style={{ marginBottom: '0.35rem' }}>
          Sua conta
        </p>
        <h2 className="lanc-title">Configurações</h2>
        <p className="lanc-subtitle">
          Altere sua senha e o e-mail de login/recuperação com segurança.
        </p>
      </header>

      <section className="conta-profile glass fade-up">
        <div className="conta-avatar">{usuario?.nome?.charAt(0) ?? 'U'}</div>
        <div>
          <strong>{usuario?.nomeCompleto || usuario?.nome}</strong>
          <p>
            {usuario?.cargo} · {usuario?.email}
          </p>
          <p className="conta-meta">Empresa {usuario?.empresaId}</p>
        </div>
      </section>

      <div className="conta-grid">
        <form
          data-tour="conta-senha"
          className="conta-card glass fade-up fade-up-delay-1"
          onSubmit={(e) => void salvarSenha(e)}
        >
          <div className="conta-card-head">
            <span className="conta-card-icon">
              <Lock size={18} />
            </span>
            <div>
              <h3>Alterar senha</h3>
              <p>Use a senha atual e confirme a nova.</p>
            </div>
          </div>

          <PasswordField
            id="senha-atual"
            label="Senha atual"
            value={senhaAtual}
            onChange={setSenhaAtual}
            autoComplete="current-password"
            visible={showAtual}
            onToggleVisible={() => setShowAtual((v) => !v)}
          />
          <PasswordField
            id="senha-nova"
            label="Nova senha"
            value={senhaNova}
            onChange={setSenhaNova}
            autoComplete="new-password"
            visible={showNova}
            onToggleVisible={() => setShowNova((v) => !v)}
          />
          <PasswordField
            id="senha-confirma"
            label="Confirmar nova senha"
            value={confirmarSenha}
            onChange={setConfirmarSenha}
            autoComplete="new-password"
            visible={showConfirma}
            onToggleVisible={() => setShowConfirma((v) => !v)}
          />

          <div className="conta-hint">
            <Shield size={14} /> Mínimo de 6 caracteres · armazenada como hash
          </div>

          {erroSenha && <p className="lanc-error">{erroSenha}</p>}
          {okSenha && (
            <p className="conta-ok">
              <Check size={16} /> {okSenha}
            </p>
          )}

          <button type="submit" className="btn btn-accent" disabled={salvandoSenha}>
            {salvandoSenha ? (
              <>
                <Loader2 className="spin" size={16} /> Salvando…
              </>
            ) : (
              'Salvar nova senha'
            )}
          </button>
        </form>

        <form
          data-tour="conta-email"
          className="conta-card glass fade-up fade-up-delay-2"
          onSubmit={(e) => void salvarEmail(e)}
        >
          <div className="conta-card-head">
            <span className="conta-card-icon mail">
              <Mail size={18} />
            </span>
            <div>
              <h3>E-mail de login / recuperação</h3>
              <p>Atualiza o e-mail usado para entrar no Glazia.</p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="email-atual">E-mail atual</label>
            <input id="email-atual" value={usuario?.email ?? ''} disabled />
          </div>

          <div className="field">
            <label htmlFor="novo-email">Novo e-mail</label>
            <input
              id="novo-email"
              type="email"
              autoComplete="email"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              required
            />
          </div>

          <PasswordField
            id="senha-email"
            label="Confirme com sua senha atual"
            value={senhaEmail}
            onChange={setSenhaEmail}
            autoComplete="current-password"
            visible={showSenhaEmail}
            onToggleVisible={() => setShowSenhaEmail((v) => !v)}
          />

          {erroEmail && <p className="lanc-error">{erroEmail}</p>}
          {okEmail && (
            <p className="conta-ok">
              <Check size={16} /> {okEmail}
            </p>
          )}

          <button type="submit" className="btn btn-accent" disabled={salvandoEmail}>
            {salvandoEmail ? (
              <>
                <Loader2 className="spin" size={16} /> Salvando…
              </>
            ) : (
              'Salvar e-mail'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
