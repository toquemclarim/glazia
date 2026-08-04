import { AnimatePresence, motion } from 'framer-motion'
import {
  Ban,
  Building2,
  Check,
  Copy,
  Loader2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  alterarStatusPlatformEmpresa,
  atualizarPlatformEmpresa,
  criarPlatformEmpresa,
  listarPlatformEmpresas,
  obterPlatformResumo,
} from '../../services/api'
import type {
  EmpresaPlatform,
  PlanoAssinatura,
  PlatformResumo,
  StatusAssinatura,
} from '../../types'

const PLANOS: PlanoAssinatura[] = ['BASIC', 'STANDARD', 'PRO']

const PLANO_LABEL: Record<PlanoAssinatura, string> = {
  TRIAL: 'Trial — 14 dias',
  BASIC: 'Basic — 1 usuário',
  STANDARD: 'Standard — 2 usuários + chat + export',
  PRO: 'Pro — usuários ilimitados + chat + export',
}

function labelPlano(plano: string) {
  if (plano in PLANO_LABEL) {
    return PLANO_LABEL[plano as PlanoAssinatura]
  }
  return plano
}

function gerarSenha() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i += 1) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function formatRelativo(iso: string | null) {
  if (!iso) return 'Nunca'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function StatusPill({ status }: { status: StatusAssinatura }) {
  return <span className={`ops-pill ops-pill-${status}`}>{status}</span>
}

export function OpsEmpresas() {
  const [empresas, setEmpresas] = useState<EmpresaPlatform[]>([])
  const [resumo, setResumo] = useState<PlatformResumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filtro, setFiltro] = useState<'todas' | StatusAssinatura>('todas')

  const [modalCriar, setModalCriar] = useState(false)
  const [editando, setEditando] = useState<EmpresaPlatform | null>(null)
  const [confirmStatus, setConfirmStatus] = useState<{
    empresa: EmpresaPlatform
    status: StatusAssinatura
  } | null>(null)
  const [credencial, setCredencial] = useState<{
    empresa: string
    email: string
    senha: string
    nome: string
    custosIniciais: number
  } | null>(null)
  const [copiado, setCopiado] = useState(false)
  const [busy, setBusy] = useState(false)

  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [plano, setPlano] = useState<PlanoAssinatura>('STANDARD')
  const [statusNovo, setStatusNovo] = useState<'ativa' | 'trial'>('trial')
  const [contatoNome, setContatoNome] = useState('')
  const [contatoEmail, setContatoEmail] = useState('')
  const [contatoTelefone, setContatoTelefone] = useState('')
  const [observacao, setObservacao] = useState('')
  const [diretorNome, setDiretorNome] = useState('')
  const [diretorEmail, setDiretorEmail] = useState('')
  const [diretorSenha, setDiretorSenha] = useState(() => gerarSenha())
  const [comCustosIniciais, setComCustosIniciais] = useState(true)
  const [erroForm, setErroForm] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    setErro(null)
    try {
      const [lista, r] = await Promise.all([
        listarPlatformEmpresas(),
        obterPlatformResumo(),
      ])
      setEmpresas(lista)
      setResumo(r)
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível carregar o Ops',
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const filtradas = useMemo(() => {
    const termo = q.trim().toLowerCase()
    return empresas.filter((e) => {
      if (filtro !== 'todas' && e.status !== filtro) return false
      if (!termo) return true
      return (
        e.nomeFantasia.toLowerCase().includes(termo) ||
        (e.contatoEmail ?? '').toLowerCase().includes(termo) ||
        (e.contatoNome ?? '').toLowerCase().includes(termo) ||
        e.idEmpresa.toLowerCase().includes(termo)
      )
    })
  }, [empresas, filtro, q])

  const abrirCriar = () => {
    setModalCriar(true)
    setErroForm(null)
    setNome('')
    setCnpj('')
    setPlano('STANDARD')
    setStatusNovo('trial')
    setContatoNome('')
    setContatoEmail('')
    setContatoTelefone('')
    setObservacao('')
    setDiretorNome('')
    setDiretorEmail('')
    setDiretorSenha(gerarSenha())
    setComCustosIniciais(true)
  }

  const abrirEditar = (e: EmpresaPlatform) => {
    setEditando(e)
    setErroForm(null)
    setNome(e.nomeFantasia)
    setCnpj(e.cnpj ?? '')
    setPlano((e.plano as PlanoAssinatura) || 'STANDARD')
    setContatoNome(e.contatoNome ?? '')
    setContatoEmail(e.contatoEmail ?? '')
    setContatoTelefone(e.contatoTelefone ?? '')
    setObservacao(e.observacao ?? '')
  }

  const criar = async (ev: FormEvent) => {
    ev.preventDefault()
    setErroForm(null)
    setBusy(true)
    try {
      const res = await criarPlatformEmpresa({
        nomeFantasia: nome.trim(),
        cnpj: cnpj || undefined,
        plano,
        status: statusNovo,
        contatoNome: contatoNome || undefined,
        contatoEmail: contatoEmail || undefined,
        contatoTelefone: contatoTelefone || undefined,
        observacao: observacao || undefined,
        diretorNome: diretorNome.trim(),
        diretorEmail: diretorEmail.trim(),
        diretorSenhaTemporaria: diretorSenha,
        comCustosIniciais,
      })
      setModalCriar(false)
      setCredencial({
        empresa: res.empresa.nomeFantasia,
        email: res.diretor.email,
        senha: res.senhaTemporaria,
        nome: res.diretor.nomeCompleto,
        custosIniciais: res.custosIniciais ?? 0,
      })
      await carregar()
    } catch (cause) {
      setErroForm(
        cause instanceof Error ? cause.message : 'Falha ao criar empresa',
      )
    } finally {
      setBusy(false)
    }
  }

  const salvarEdicao = async (ev: FormEvent) => {
    ev.preventDefault()
    if (!editando) return
    setErroForm(null)
    setBusy(true)
    try {
      await atualizarPlatformEmpresa(editando.idEmpresa, {
        nomeFantasia: nome.trim(),
        cnpj,
        plano,
        contatoNome,
        contatoEmail: contatoEmail || null,
        contatoTelefone: contatoTelefone || null,
        observacao: observacao || null,
      })
      setEditando(null)
      await carregar()
    } catch (cause) {
      setErroForm(
        cause instanceof Error ? cause.message : 'Falha ao atualizar',
      )
    } finally {
      setBusy(false)
    }
  }

  const aplicarStatus = async () => {
    if (!confirmStatus) return
    setBusy(true)
    setErro(null)
    try {
      await alterarStatusPlatformEmpresa(
        confirmStatus.empresa.idEmpresa,
        confirmStatus.status,
      )
      setConfirmStatus(null)
      await carregar()
    } catch (cause) {
      setErro(
        cause instanceof Error ? cause.message : 'Falha ao alterar status',
      )
    } finally {
      setBusy(false)
    }
  }

  const copiar = async () => {
    if (!credencial) return
    const texto = `Glazia — acesso do Diretor\nEmpresa: ${credencial.empresa}\nNome: ${credencial.nome}\nE-mail: ${credencial.email}\nSenha temporária: ${credencial.senha}\n\nPeça para trocar a senha em Configurações após o login.`
    await navigator.clipboard.writeText(texto)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2200)
  }

  return (
    <div className="ops-page">
      <header className="ops-hero">
        <div>
          <p className="ops-kicker">Carteira de clientes</p>
          <h1 className="ops-display">Empresas Glazia</h1>
          <p className="ops-hero-sub">
            Provisionamento, planos e suspensão — sem SQL no dia a dia.
          </p>
        </div>
        <div className="ops-hero-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => void carregar()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'spin' : undefined} />
            Atualizar
          </button>
          <button type="button" className="btn btn-accent" onClick={abrirCriar}>
            <Plus size={16} />
            Nova empresa
          </button>
        </div>
      </header>

      <section className="ops-metrics">
        {[
          { label: 'Clientes', value: resumo?.totalEmpresas ?? '—', hint: 'total' },
          { label: 'Ativas', value: resumo?.ativas ?? '—', hint: 'pagando' },
          { label: 'Trial', value: resumo?.trial ?? '—', hint: 'onboarding' },
          { label: 'Suspensas', value: resumo?.suspensas ?? '—', hint: 'bloqueio' },
          {
            label: 'Usuários',
            value: resumo?.usuariosAtivos ?? '—',
            hint: 'ativos',
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            className="ops-metric"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.4 }}
          >
            <span>{m.label}</span>
            <strong>{m.value}</strong>
            <em>{m.hint}</em>
          </motion.div>
        ))}
      </section>

      <div className="ops-toolbar">
        <div className="ops-search">
          <Search size={16} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar empresa, contato ou e-mail"
          />
        </div>
        <div className="ops-filters" role="tablist">
          {(['todas', 'ativa', 'trial', 'inativa', 'suspensa', 'cancelada'] as const).map(
            (f) => (
              <button
                key={f}
                type="button"
                className={`ops-filter${filtro === f ? ' ativo' : ''}`}
                onClick={() => setFiltro(f)}
              >
                {f}
              </button>
            ),
          )}
        </div>
      </div>

      {erro && <p className="lanc-error">{erro}</p>}

      {loading ? (
        <div className="ops-empty">
          <Loader2 className="spin" size={22} /> Carregando carteira…
        </div>
      ) : filtradas.length === 0 ? (
        <div className="ops-empty">
          <Building2 size={28} />
          <p>Nenhuma empresa neste filtro.</p>
          <button type="button" className="btn btn-accent" onClick={abrirCriar}>
            <Sparkles size={16} /> Criar a primeira
          </button>
        </div>
      ) : (
        <ul className="ops-empresa-list">
          {filtradas.map((e, index) => (
            <motion.li
              key={e.idEmpresa}
              className={`ops-empresa-card ops-empresa-${e.status}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}
            >
              <button
                type="button"
                className="ops-empresa-main"
                onClick={() => abrirEditar(e)}
              >
                <div className="ops-empresa-mark">
                  {e.nomeFantasia.charAt(0).toUpperCase()}
                </div>
                <div className="ops-empresa-copy">
                  <div className="ops-empresa-title">
                    <strong>{e.nomeFantasia}</strong>
                    <StatusPill status={e.status} />
                    <span className="ops-plano">{labelPlano(e.plano)}</span>
                  </div>
                  <p>
                    {e.contatoNome || 'Sem contato'} ·{' '}
                    {e.contatoEmail || 'sem e-mail'}
                  </p>
                  <p className="ops-empresa-meta">
                    {e.usuariosAtivos}/{e.usuariosTotal} usuários · último login{' '}
                    {formatRelativo(e.ultimoLogin)}
                  </p>
                </div>
              </button>
              <div className="ops-empresa-actions">
                {e.status === 'suspensa' ||
                e.status === 'cancelada' ||
                e.status === 'inativa' ? (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setConfirmStatus({ empresa: e, status: 'ativa' })
                    }
                  >
                    <PlayCircle size={16} /> Reativar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() =>
                      setConfirmStatus({ empresa: e, status: 'suspensa' })
                    }
                  >
                    <PauseCircle size={16} /> Suspender
                  </button>
                )}
                {e.status !== 'cancelada' && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    title="Cancelar contrato"
                    onClick={() =>
                      setConfirmStatus({ empresa: e, status: 'cancelada' })
                    }
                  >
                    <Ban size={16} />
                  </button>
                )}
              </div>
            </motion.li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {modalCriar && (
          <div className="ops-backdrop" role="presentation">
            <motion.form
              className="ops-modal"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }}
              onSubmit={(e) => void criar(e)}
            >
              <div className="ops-modal-head">
                <div>
                  <p className="ops-kicker">Onboarding</p>
                  <h2>Nova empresa</h2>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setModalCriar(false)}
                  aria-label="Fechar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="ops-modal-grid">
                <div className="field">
                  <label htmlFor="op-nome">Nome fantasia</label>
                  <input
                    id="op-nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="op-cnpj">CNPJ (opcional)</label>
                  <input
                    id="op-cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="op-plano">Plano</label>
                  <select
                    id="op-plano"
                    value={plano}
                    onChange={(e) => setPlano(e.target.value as PlanoAssinatura)}
                  >
                    {PLANOS.map((p) => (
                      <option key={p} value={p}>
                        {PLANO_LABEL[p]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="op-status">Status inicial</label>
                  <select
                    id="op-status"
                    value={statusNovo}
                    onChange={(e) =>
                      setStatusNovo(e.target.value as 'ativa' | 'trial')
                    }
                  >
                    <option value="trial">Trial</option>
                    <option value="ativa">Ativa</option>
                  </select>
                </div>
              </div>

              <p className="ops-section-label">Contato comercial</p>
              <div className="ops-modal-grid">
                <div className="field">
                  <label htmlFor="op-cnome">Nome</label>
                  <input
                    id="op-cnome"
                    value={contatoNome}
                    onChange={(e) => setContatoNome(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="op-cemail">E-mail</label>
                  <input
                    id="op-cemail"
                    type="email"
                    value={contatoEmail}
                    onChange={(e) => setContatoEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="op-ctel">Telefone</label>
                  <input
                    id="op-ctel"
                    value={contatoTelefone}
                    onChange={(e) => setContatoTelefone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="op-obs">Observação</label>
                  <input
                    id="op-obs"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                </div>
              </div>

              <p className="ops-section-label">Diretor inicial</p>
              <div className="ops-modal-grid">
                <div className="field">
                  <label htmlFor="op-dnome">Nome do diretor</label>
                  <input
                    id="op-dnome"
                    value={diretorNome}
                    onChange={(e) => setDiretorNome(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="op-demail">E-mail de login</label>
                  <input
                    id="op-demail"
                    type="email"
                    value={diretorEmail}
                    onChange={(e) => setDiretorEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="field ops-span-2">
                  <label htmlFor="op-dsenha">Senha temporária</label>
                  <div className="ops-senha-row">
                    <input
                      id="op-dsenha"
                      value={diretorSenha}
                      onChange={(e) => setDiretorSenha(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => setDiretorSenha(gerarSenha())}
                    >
                      Gerar
                    </button>
                  </div>
                </div>
              </div>

              <label className="ops-check">
                <input
                  type="checkbox"
                  checked={comCustosIniciais}
                  onChange={(e) => setComCustosIniciais(e.target.checked)}
                />
                <span>
                  Incluir custos fixos iniciais da vidraçaria (aluguel, energia,
                  internet, software, seguro) — o Diretor ajusta os valores.
                </span>
              </label>

              {erroForm && <p className="lanc-error">{erroForm}</p>}

              <div className="ops-modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setModalCriar(false)}
                  disabled={busy}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-accent" disabled={busy}>
                  {busy ? (
                    <>
                      <Loader2 className="spin" size={16} /> Criando…
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} /> Criar e gerar acesso
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editando && (
          <div className="ops-backdrop" role="presentation">
            <motion.form
              className="ops-modal"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              onSubmit={(e) => void salvarEdicao(e)}
            >
              <div className="ops-modal-head">
                <div>
                  <p className="ops-kicker">{editando.idEmpresa}</p>
                  <h2>Editar empresa</h2>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => setEditando(null)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="ops-modal-grid">
                <div className="field">
                  <label>Nome fantasia</label>
                  <input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>CNPJ</label>
                  <input value={cnpj} onChange={(e) => setCnpj(e.target.value)} />
                </div>
                <div className="field">
                  <label>Plano da empresa</label>
                  <select
                    value={plano}
                    onChange={(e) => setPlano(e.target.value as PlanoAssinatura)}
                  >
                    {PLANOS.map((p) => (
                      <option key={p} value={p}>
                        {PLANO_LABEL[p]}
                      </option>
                    ))}
                  </select>
                  <p className="ops-field-hint">
                    Alterar o plano libera ou restringe chat, exportação e
                    quantidade de usuários imediatamente.
                  </p>
                </div>
                <div className="field">
                  <label>Status</label>
                  <input value={editando.status} disabled />
                </div>
                <div className="field">
                  <label>Contato</label>
                  <input
                    value={contatoNome}
                    onChange={(e) => setContatoNome(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>E-mail</label>
                  <input
                    type="email"
                    value={contatoEmail}
                    onChange={(e) => setContatoEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Telefone</label>
                  <input
                    value={contatoTelefone}
                    onChange={(e) => setContatoTelefone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Observação</label>
                  <input
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                  />
                </div>
              </div>
              {erroForm && <p className="lanc-error">{erroForm}</p>}
              <div className="ops-modal-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setEditando(null)}
                >
                  Fechar
                </button>
                <button type="submit" className="btn btn-accent" disabled={busy}>
                  {busy ? 'Salvando…' : 'Salvar alterações'}
                </button>
              </div>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {confirmStatus && (
        <div className="ops-backdrop">
          <div className="ops-modal ops-modal-sm">
            <h2>
              {confirmStatus.status === 'suspensa'
                ? 'Suspender empresa'
                : confirmStatus.status === 'cancelada'
                  ? 'Cancelar empresa'
                  : 'Reativar empresa'}
            </h2>
            <p>
              <strong>{confirmStatus.empresa.nomeFantasia}</strong> passará para{' '}
              <StatusPill status={confirmStatus.status} />. Usuários da empresa
              {confirmStatus.status === 'ativa'
                ? ' voltam a entrar normalmente.'
                : ' perdem o acesso imediatamente.'}
            </p>
            <div className="ops-modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmStatus(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={busy}
                onClick={() => void aplicarStatus()}
              >
                {busy ? 'Aplicando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {credencial && (
        <div className="ops-backdrop">
          <div className="ops-modal ops-modal-sm">
            <p className="ops-kicker">Acesso gerado</p>
            <h2>Diretor pronto</h2>
            <p>
              Envie fora do Glazia. A senha não fica em texto puro no banco.
              {credencial.custosIniciais > 0
                ? ` Foram criados ${credencial.custosIniciais} custos fixos ilustrativos.`
                : ''}
            </p>
            <dl className="ops-cred-grid">
              <div>
                <dt>Empresa</dt>
                <dd>{credencial.empresa}</dd>
              </div>
              <div>
                <dt>Diretor</dt>
                <dd>{credencial.nome}</dd>
              </div>
              <div>
                <dt>E-mail</dt>
                <dd>{credencial.email}</dd>
              </div>
              <div>
                <dt>Senha</dt>
                <dd className="ops-mono">{credencial.senha}</dd>
              </div>
            </dl>
            <div className="ops-modal-actions">
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
                onClick={() => void copiar()}
              >
                {copiado ? <Check size={16} /> : <Copy size={16} />}
                {copiado ? 'Copiado' : 'Copiar credenciais'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
