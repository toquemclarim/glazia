import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { BrandLogo } from '../components/BrandLogo'
import { useApp } from '../context/AppContext'
import { queueWelcomeScreen } from '../utils/welcome'

function onlyDigits(v: string) {
  return v.replace(/\D/g, '')
}

function maskPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11)
  if (d.length <= 2) return d
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function maskCnpj(v: string) {
  const d = onlyDigits(v).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function CriarConta() {
  const { signup, loading, error, usuario, bootstrapping } = useApp()
  const navigate = useNavigate()

  const [nomeFantasia, setNomeFantasia] = useState('')
  const [razaoSocial, setRazaoSocial] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [nomeDiretor, setNomeDiretor] = useState('')
  const [telefone, setTelefone] = useState('')
  const [emailContato, setEmailContato] = useState('')
  const [emailLogin, setEmailLogin] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [showSenha, setShowSenha] = useState(false)
  const [localErro, setLocalErro] = useState('')

  const telefoneDigits = useMemo(() => onlyDigits(telefone), [telefone])

  if (!bootstrapping && usuario) {
    if (usuario.empresaBloqueada) return <Navigate to="/home" replace />
    if (usuario.deveTrocarSenha) {
      return <Navigate to="/primeiro-acesso" replace />
    }
    return <Navigate to="/home" replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLocalErro('')

    if (nomeFantasia.trim().length < 2) {
      setLocalErro('Informe o nome fantasia da empresa.')
      return
    }
    if (nomeDiretor.trim().length < 2) {
      setLocalErro('Informe o nome do diretor / proprietário.')
      return
    }
    if (telefoneDigits.length < 10 || telefoneDigits.length > 11) {
      setLocalErro('Telefone inválido. Use DDD + número.')
      return
    }
    if (!emailContato.includes('@') || !emailLogin.includes('@')) {
      setLocalErro('Informe e-mails válidos.')
      return
    }
    if (senha.length < 8) {
      setLocalErro('A senha deve ter no mínimo 8 caracteres.')
      return
    }
    if (senha !== confirmarSenha) {
      setLocalErro('A confirmação de senha não confere.')
      return
    }
    if (!aceitouTermos) {
      setLocalErro('Aceite os Termos de Uso e a Política de Privacidade.')
      return
    }

    const user = await signup({
      nomeFantasia: nomeFantasia.trim(),
      razaoSocial: razaoSocial.trim() || undefined,
      cnpj: onlyDigits(cnpj) || undefined,
      nomeDiretor: nomeDiretor.trim(),
      telefone: telefoneDigits,
      emailContato: emailContato.trim(),
      emailLogin: emailLogin.trim(),
      senha,
      confirmarSenha,
      aceitouTermos: true,
    })

    if (!user) return
    if (user.deveTrocarSenha) {
      navigate('/primeiro-acesso', { replace: true })
      return
    }
    queueWelcomeScreen()
    navigate('/boas-vindas', { replace: true })
  }

  return (
    <div className="signup-page">
      <div className="signup-card signup-card-in">
        <Link to="/" className="signup-back">
          <ArrowLeft size={16} />
          Voltar
        </Link>

        <div className="signup-brand">
          <BrandLogo variant="full" size="nav" />
        </div>
        <h1>Criar conta</h1>
        <p className="signup-sub">
          14 dias grátis para entender para onde o dinheiro da sua vidraçaria
          está indo. Sem cartão de crédito.
        </p>

        <form className="signup-form" onSubmit={(e) => void onSubmit(e)}>
          <p className="signup-group-title">Dados da empresa</p>

          <div className="field">
            <label htmlFor="sf-fantasia">Nome fantasia *</label>
            <input
              id="sf-fantasia"
              value={nomeFantasia}
              onChange={(e) => setNomeFantasia(e.target.value)}
              required
              autoComplete="organization"
            />
          </div>

          <div className="field">
            <label htmlFor="sf-razao">Razão social</label>
            <input
              id="sf-razao"
              value={razaoSocial}
              onChange={(e) => setRazaoSocial(e.target.value)}
              autoComplete="organization"
            />
          </div>

          <div className="field">
            <label htmlFor="sf-cnpj">CNPJ</label>
            <input
              id="sf-cnpj"
              value={cnpj}
              onChange={(e) => setCnpj(maskCnpj(e.target.value))}
              inputMode="numeric"
              placeholder="Opcional neste momento"
            />
          </div>

          <div className="field">
            <label htmlFor="sf-diretor">Nome do diretor / proprietário *</label>
            <input
              id="sf-diretor"
              value={nomeDiretor}
              onChange={(e) => setNomeDiretor(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="signup-row">
            <div className="field">
              <label htmlFor="sf-tel">Telefone *</label>
              <input
                id="sf-tel"
                value={telefone}
                onChange={(e) => setTelefone(maskPhone(e.target.value))}
                required
                inputMode="tel"
                autoComplete="tel"
                placeholder="(71) 99999-9999"
              />
            </div>
            <div className="field">
              <label htmlFor="sf-email-contato">E-mail de contato *</label>
              <input
                id="sf-email-contato"
                type="email"
                value={emailContato}
                onChange={(e) => setEmailContato(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </div>

          <p className="signup-group-title">Dados de acesso</p>

          <div className="field">
            <label htmlFor="sf-email-login">E-mail de login *</label>
            <input
              id="sf-email-login"
              type="email"
              value={emailLogin}
              onChange={(e) => setEmailLogin(e.target.value)}
              required
              autoComplete="username"
            />
            <small className="field-hint">
              Poderá ser alterado depois nas configurações da conta.
            </small>
          </div>

          <div className="signup-row">
            <div className="field">
              <label htmlFor="sf-senha">Senha temporária *</label>
              <div className="conta-password-wrap">
                <input
                  id="sf-senha"
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="btn-icon"
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                  onClick={() => setShowSenha((v) => !v)}
                >
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <small className="field-hint">Mínimo 8 caracteres. Troca obrigatória no 1º acesso.</small>
            </div>
            <div className="field">
              <label htmlFor="sf-senha2">Confirmar senha *</label>
              <input
                id="sf-senha2"
                type={showSenha ? 'text' : 'password'}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
          </div>

          <label className="signup-terms">
            <input
              type="checkbox"
              checked={aceitouTermos}
              onChange={(e) => setAceitouTermos(e.target.checked)}
            />
            <span>
              Li e aceito os Termos de Uso e a Política de Privacidade do Glazia.
            </span>
          </label>

          {(localErro || error) && (
            <p className="form-error" role="alert">
              {localErro || error}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-accent signup-submit"
            disabled={loading}
          >
            {loading ? 'Criando…' : 'Começar trial de 14 dias'}
            {!loading && <ArrowRight size={18} />}
          </button>

          <p className="signup-login">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
