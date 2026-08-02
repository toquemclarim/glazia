import {
  Check,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Plus,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { PlanUpsellModal } from '../components/PlanUpsellModal'
import { useApp } from '../context/AppContext'
import {
  alterarAtivoUsuarioEquipe,
  criarUsuarioEquipe,
  listarEquipe,
} from '../services/api'
import type { Cargo, CargoConvidavel, UsuarioEquipe } from '../types'

const CARGOS_CONVITE: Array<{
  value: CargoConvidavel
  label: string
  hint: string
}> = [
  { value: 'ADM', label: 'ADM', hint: 'Lançamentos e clientes' },
  { value: 'VENDAS', label: 'Vendas', hint: 'Operação comercial do dia a dia' },
  { value: 'SOCIO', label: 'Sócio', hint: 'Análise financeira' },
]

const LABEL_CARGO: Record<Cargo, string> = {
  ADM: 'ADM',
  VENDAS: 'Vendas',
  SOCIO: 'Sócio',
  DIRETOR: 'Diretor',
  PLATFORM: 'Platform',
}

function gerarSenhaTemporaria() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)]
  }
  return out
}

type CredencialCriada = {
  email: string
  senha: string
  nome: string
  cargo: CargoConvidavel
}

export function Equipe() {
  const { usuario, plano } = useApp()
  const [itens, setItens] = useState<UsuarioEquipe[]>([])
  const [loading, setLoading] = useState(true)
  const [upsell, setUpsell] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [acaoId, setAcaoId] = useState<string | null>(null)

  const [modalCriar, setModalCriar] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cargo, setCargo] = useState<CargoConvidavel>('ADM')
  const [senhaTemp, setSenhaTemp] = useState(() => gerarSenhaTemporaria())
  const [showSenha, setShowSenha] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const [confirmDesativar, setConfirmDesativar] =
    useState<UsuarioEquipe | null>(null)
  const [credencial, setCredencial] = useState<CredencialCriada | null>(null)
  const [copiado, setCopiado] = useState(false)

  const ativos = useMemo(() => itens.filter((u) => u.ativo).length, [itens])
  const podeNovoUsuario =
    plano.maxUsuarios == null || ativos < plano.maxUsuarios
  const limiteLabel =
    plano.maxUsuarios == null
      ? 'Ilimitados'
      : `${ativos}/${plano.maxUsuarios}`

  const carregar = useCallback(async () => {
    setErro(null)
    setLoading(true)
    try {
      setItens(await listarEquipe())
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar a equipe',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const abrirCriar = () => {
    if (!podeNovoUsuario) {
      setUpsell(true)
      return
    }
    setModalCriar(true)
    setErroForm(null)
    setNome('')
    setEmail('')
    setCargo('ADM')
    setSenhaTemp(gerarSenhaTemporaria())
    setShowSenha(true)
  }

  const fecharCriar = () => {
    if (salvando) return
    setModalCriar(false)
    setErroForm(null)
  }

  const criar = async (e: FormEvent) => {
    e.preventDefault()
    setErroForm(null)
    setSalvando(true)
    try {
      const res = await criarUsuarioEquipe({
        email: email.trim(),
        nomeCompleto: nome.trim(),
        cargo,
        senhaTemporaria: senhaTemp,
      })
      setModalCriar(false)
      setCredencial({
        email: res.usuario.email,
        senha: res.senhaTemporaria,
        nome: res.usuario.nomeCompleto,
        cargo,
      })
      setCopiado(false)
      await carregar()
    } catch (cause) {
      setErroForm(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível criar o usuário',
      )
    } finally {
      setSalvando(false)
    }
  }

  const confirmarDesativarUsuario = async () => {
    if (!confirmDesativar) return
    setAcaoId(confirmDesativar.idUser)
    setErro(null)
    try {
      const updated = await alterarAtivoUsuarioEquipe(
        confirmDesativar.idUser,
        false,
      )
      setItens((prev) =>
        prev.map((u) => (u.idUser === updated.idUser ? updated : u)),
      )
      setConfirmDesativar(null)
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível desativar o usuário',
      )
    } finally {
      setAcaoId(null)
    }
  }

  const ativarUsuario = async (item: UsuarioEquipe) => {
    if (!podeNovoUsuario) {
      setUpsell(true)
      return
    }
    setAcaoId(item.idUser)
    setErro(null)
    try {
      const updated = await alterarAtivoUsuarioEquipe(item.idUser, true)
      setItens((prev) =>
        prev.map((u) => (u.idUser === updated.idUser ? updated : u)),
      )
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível ativar o usuário',
      )
    } finally {
      setAcaoId(null)
    }
  }

  const copiarCredenciais = async () => {
    if (!credencial) return
    const texto = `Glazia — acesso\nNome: ${credencial.nome}\nCargo: ${LABEL_CARGO[credencial.cargo]}\nE-mail: ${credencial.email}\nSenha temporária: ${credencial.senha}\n\nPeça para trocar a senha em Configurações após o primeiro login.`
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch {
      setCopiado(false)
    }
  }

  return (
    <div className="equipe-page">
      <header className="df-intro fade-up">
        <div>
          <p className="section-title" style={{ marginBottom: '0.35rem' }}>
            Acesso da empresa
          </p>
          <h2 className="lanc-title">Equipe</h2>
          <p className="lanc-subtitle">
            Convide ADM, Vendas ou Sócio com senha temporária. Só o Diretor
            gerencia a equipe — e não é possível criar outro Diretor por aqui.
            Plano {plano.label}: {limiteLabel} usuários ativos.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-accent"
          data-tour="equipe-novo"
          onClick={abrirCriar}
        >
          {podeNovoUsuario ? <Plus size={16} /> : <Lock size={16} />}
          Novo acesso
        </button>
      </header>

      <div className="equipe-resumo fade-up">
        <div className="equipe-resumo-item glass">
          <span>Total</span>
          <strong>{itens.length}</strong>
        </div>
        <div className="equipe-resumo-item glass">
          <span>Ativos</span>
          <strong>{ativos}</strong>
        </div>
        <div className="equipe-resumo-item glass">
          <span>Inativos</span>
          <strong>{itens.length - ativos}</strong>
        </div>
      </div>

      {erro && <p className="lanc-error fade-up">{erro}</p>}

      <section className="glass fade-up equipe-lista">
        {loading ? (
          <div className="clientes-empty">
            <Loader2 className="spin" size={22} />
            Carregando equipe…
          </div>
        ) : itens.length === 0 ? (
          <div className="clientes-empty">
            <Users size={28} />
            <p>Nenhum usuário nesta empresa.</p>
          </div>
        ) : (
          <ul className="equipe-cards">
            {itens.map((item) => {
              const isSelf = item.idUser === usuario?.idUser
              const busy = acaoId === item.idUser
              return (
                <li
                  key={item.idUser}
                  className={`equipe-card${item.ativo ? '' : ' inativo'}`}
                >
                  <div className="equipe-card-main">
                    <div className="equipe-avatar">
                      {item.nomeCompleto.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="equipe-card-nome">
                        <strong>{item.nomeCompleto}</strong>
                        {isSelf && <span className="equipe-voce">você</span>}
                      </div>
                      <p className="equipe-card-email">{item.email}</p>
                    </div>
                  </div>

                  <div className="equipe-card-meta">
                    <span className="equipe-cargo-pill">
                      {LABEL_CARGO[item.cargo]}
                    </span>
                    <span
                      className={`equipe-status${item.ativo ? ' on' : ''}`}
                    >
                      {item.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="equipe-card-acoes">
                    {item.ativo ? (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={busy || isSelf}
                        title={
                          isSelf
                            ? 'Você não pode desativar a própria conta'
                            : 'Desativar acesso'
                        }
                        onClick={() => setConfirmDesativar(item)}
                      >
                        {busy ? (
                          <Loader2 className="spin" size={16} />
                        ) : (
                          <>
                            <UserMinus size={16} /> Desativar
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        disabled={busy}
                        onClick={() => void ativarUsuario(item)}
                      >
                        {busy ? (
                          <Loader2 className="spin" size={16} />
                        ) : (
                          <>
                            <UserPlus size={16} /> Ativar
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {modalCriar && (
        <div
          className="df-drawer-backdrop"
          role="presentation"
          onClick={fecharCriar}
        >
          <form
            className="equipe-modal glass"
            role="dialog"
            aria-modal="true"
            aria-labelledby="equipe-criar-title"
            onClick={(e) => e.stopPropagation()}
            onSubmit={(e) => void criar(e)}
          >
            <div className="equipe-modal-head">
              <div className="conta-card-head" style={{ margin: 0 }}>
                <span className="conta-card-icon">
                  <UserCog size={18} />
                </span>
                <div>
                  <h3 id="equipe-criar-title">Novo acesso</h3>
                  <p>ADM, Vendas ou Sócio · senha temporária</p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={fecharCriar}
                aria-label="Fechar"
                disabled={salvando}
              >
                <X size={18} />
              </button>
            </div>

            <div className="field">
              <label htmlFor="eq-nome">Nome completo</label>
              <input
                id="eq-nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
                minLength={2}
                autoComplete="name"
              />
            </div>

            <div className="field">
              <label htmlFor="eq-email">E-mail de login</label>
              <input
                id="eq-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="off"
              />
            </div>

            <fieldset className="equipe-cargos">
              <legend>Cargo</legend>
              <div className="equipe-cargos-grid">
                {CARGOS_CONVITE.map((c) => (
                  <label
                    key={c.value}
                    className={`equipe-cargo-option${cargo === c.value ? ' ativo' : ''}`}
                  >
                    <input
                      type="radio"
                      name="cargo"
                      value={c.value}
                      checked={cargo === c.value}
                      onChange={() => setCargo(c.value)}
                    />
                    <strong>{c.label}</strong>
                    <span>{c.hint}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="field">
              <label htmlFor="eq-senha">Senha temporária</label>
              <div className="conta-password-wrap">
                <input
                  id="eq-senha"
                  type={showSenha ? 'text' : 'password'}
                  value={senhaTemp}
                  onChange={(e) => setSenhaTemp(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="conta-password-toggle"
                  onClick={() => setShowSenha((v) => !v)}
                  aria-label={showSenha ? 'Ocultar senha' : 'Mostrar senha'}
                >
                  {showSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="button"
                className="btn btn-ghost equipe-gerar-senha"
                onClick={() => {
                  setSenhaTemp(gerarSenhaTemporaria())
                  setShowSenha(true)
                }}
              >
                Gerar outra
              </button>
            </div>

            {erroForm && <p className="lanc-error">{erroForm}</p>}

            <div className="df-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={fecharCriar}
                disabled={salvando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-accent"
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <Loader2 className="spin" size={16} /> Criando…
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Criar acesso
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDesativar && (
        <div className="df-drawer-backdrop" role="presentation">
          <div
            className="df-confirm glass"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="equipe-desativar-title"
          >
            <h3 id="equipe-desativar-title">Desativar acesso</h3>
            <p>
              Tem certeza que deseja desativar{' '}
              <strong>{confirmDesativar.nomeCompleto}</strong> (
              {confirmDesativar.email})? A sessão será bloqueada na próxima
              requisição.
            </p>
            <div className="df-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={Boolean(acaoId)}
                onClick={() => setConfirmDesativar(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={Boolean(acaoId)}
                onClick={() => void confirmarDesativarUsuario()}
              >
                {acaoId ? (
                  <>
                    <Loader2 className="spin" size={16} /> Desativando…
                  </>
                ) : (
                  'Sim, desativar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {credencial && (
        <div className="df-drawer-backdrop" role="presentation">
          <div
            className="df-confirm glass equipe-credencial-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="equipe-cred-title"
          >
            <h3 id="equipe-cred-title">Acesso criado</h3>
            <p>
              Envie estas credenciais fora do Glazia (WhatsApp ou e-mail
              pessoal). Elas não ficam salvas em texto puro no sistema.
            </p>
            <dl className="equipe-credencial-grid">
              <div>
                <dt>Nome</dt>
                <dd>{credencial.nome}</dd>
              </div>
              <div>
                <dt>Cargo</dt>
                <dd>{LABEL_CARGO[credencial.cargo]}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{credencial.email}</dd>
              </div>
              <div>
                <dt>Senha temporária</dt>
                <dd className="equipe-senha">{credencial.senha}</dd>
              </div>
            </dl>
            <div className="df-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setCredencial(null)}
              >
                Fechar
              </button>
              <button
                type="button"
                className="btn btn-accent"
                onClick={() => void copiarCredenciais()}
              >
                {copiado ? <Check size={16} /> : <Copy size={16} />}
                {copiado ? 'Copiado' : 'Copiar para enviar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <PlanUpsellModal
        open={upsell}
        feature="usuarios"
        planoAtual={usuario?.plano}
        onClose={() => setUpsell(false)}
      />
    </div>
  )
}
