import {
  Loader2,
  Pencil,
  Plus,
  Search,
  UserCheck,
  UserRound,
  UserX,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ClienteFormModal } from '../components/ClienteFormModal'
import {
  desativarCliente,
  listarClientes,
  reativarCliente,
} from '../services/api'
import type { Cliente } from '../types'

type StatusFiltro = 'ativos' | 'inativos' | 'todos'

function docLabel(c: Cliente) {
  if (c.tipoPessoa === 'PF') return c.cpf ? `CPF ${c.cpf}` : 'PF'
  return c.cnpj ? `CNPJ ${c.cnpj}` : 'PJ'
}

const FILTROS: Array<{ id: StatusFiltro; label: string }> = [
  { id: 'ativos', label: 'Ativos' },
  { id: 'inativos', label: 'Inativos' },
  { id: 'todos', label: 'Todos' },
]

export function Clientes() {
  const [itens, setItens] = useState<Cliente[]>([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState<StatusFiltro>('ativos')
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState<Cliente | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const carregar = useCallback(
    async (busca?: string, filtro?: StatusFiltro) => {
      const statusAtual = filtro ?? status
      setLoading(true)
      setErro(null)
      try {
        const res = await listarClientes(busca, { status: statusAtual })
        setItens(res.itens)
      } catch (cause) {
        setErro(
          cause instanceof Error
            ? cause.message
            : 'Não foi possível carregar os clientes',
        )
      } finally {
        setLoading(false)
      }
    },
    [status],
  )

  useEffect(() => {
    void carregar(q, status)
  }, [carregar, status]) // eslint-disable-line react-hooks/exhaustive-deps -- q só na busca manual

  const buscar = () => {
    void carregar(q, status)
  }

  const reativar = async (c: Cliente) => {
    setBusyId(c.id)
    setErro(null)
    try {
      const res = await reativarCliente(c.id)
      setOk(res.mensagem)
      await carregar(q, status)
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível reativar o cliente',
      )
    } finally {
      setBusyId(null)
    }
  }

  const confirmarDesativar = async () => {
    if (!confirmExcluir) return
    setBusyId(confirmExcluir.id)
    setErro(null)
    try {
      const res = await desativarCliente(confirmExcluir.id)
      setOk(res.mensagem)
      setConfirmExcluir(null)
      await carregar(q, status)
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : 'Não foi possível desativar o cliente',
      )
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="clientes-page">
      <header className="df-intro fade-up">
        <div>
          <p className="section-title" style={{ marginBottom: '0.35rem' }}>
            Base comercial
          </p>
          <h1>Clientes</h1>
          <p>
            Cadastro PF/PJ da empresa. Só o nome é obrigatório; complete os
            demais dados quando precisar.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-accent"
          data-tour="clientes-novo"
          onClick={() => {
            setEditando(null)
            setModalOpen(true)
          }}
        >
          <Plus size={16} /> Novo cliente
        </button>
      </header>

      {(erro || ok) && (
        <div
          className="glass"
          style={{
            padding: '0.85rem 1rem',
            marginBottom: '1rem',
            color: erro ? 'var(--danger)' : 'var(--success, #2d9f6f)',
          }}
        >
          {erro || ok}
        </div>
      )}

      <div className="clientes-toolbar glass fade-up">
        <div className="clientes-filtros" role="tablist" aria-label="Status">
          {FILTROS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={status === f.id}
              className={`clientes-filtro${status === f.id ? ' ativo' : ''}`}
              onClick={() => setStatus(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="field" style={{ flex: 1, margin: 0 }}>
          <label htmlFor="cli-busca" className="sr-only">
            Buscar
          </label>
          <div className="clientes-search">
            <Search size={16} />
            <input
              id="cli-busca"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') buscar()
              }}
              placeholder="Nome, matrícula, CPF/CNPJ ou e-mail"
            />
          </div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={buscar}>
          Buscar
        </button>
      </div>

      {loading ? (
        <div className="glass" style={{ padding: '1.25rem' }}>
          <Loader2 className="spin" size={18} /> Carregando…
        </div>
      ) : itens.length === 0 ? (
        <div className="glass clientes-empty fade-up">
          <UserRound size={28} />
          <p>
            {status === 'inativos'
              ? 'Nenhum cliente inativo.'
              : status === 'ativos'
                ? 'Nenhum cliente ativo cadastrado.'
                : 'Nenhum cliente cadastrado ainda.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap glass fade-up">
          <table className="data">
            <thead>
              <tr>
                <th>Matrícula</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Contato</th>
                <th>Cidade</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((c) => (
                <tr key={c.id} className={c.ativo === false ? 'muted-row' : ''}>
                  <td>
                    <code>{c.matricula}</code>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {c.nome}
                    {c.nomeFantasia && (
                      <div
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 400,
                          color: 'var(--text-muted)',
                        }}
                      >
                        {c.nomeFantasia}
                      </div>
                    )}
                  </td>
                  <td>{docLabel(c)}</td>
                  <td>{c.celular || c.telefone || c.email || '—'}</td>
                  <td>{[c.cidade, c.uf].filter(Boolean).join('/') || '—'}</td>
                  <td>
                    <span
                      className={`analise-status ${c.ativo === false ? 'open' : 'ok'}`}
                    >
                      {c.ativo === false ? 'Inativo' : 'Ativo'}
                    </span>
                  </td>
                  <td>
                    <div className="df-card-actions">
                      <button
                        type="button"
                        className="btn-icon"
                        title="Editar"
                        aria-label="Editar"
                        onClick={() => {
                          setEditando(c)
                          setModalOpen(true)
                        }}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="btn-icon"
                        title={c.ativo === false ? 'Reativar' : 'Desativar'}
                        aria-label={
                          c.ativo === false ? 'Reativar' : 'Desativar'
                        }
                        disabled={busyId === c.id}
                        onClick={() => {
                          if (c.ativo === false) {
                            void reativar(c)
                          } else {
                            setConfirmExcluir(c)
                          }
                        }}
                      >
                        {busyId === c.id ? (
                          <Loader2 className="spin" size={16} />
                        ) : c.ativo === false ? (
                          <UserCheck size={16} />
                        ) : (
                          <UserX size={16} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ClienteFormModal
        open={modalOpen}
        cliente={editando}
        onClose={() => {
          setModalOpen(false)
          setEditando(null)
        }}
        onSaved={() => {
          setOk(editando ? 'Cliente atualizado' : 'Cliente cadastrado')
          void carregar(q, status)
        }}
      />

      {confirmExcluir && (
        <div className="df-drawer-backdrop" role="presentation">
          <div
            className="df-confirm glass"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="cli-excluir-title"
          >
            <h3 id="cli-excluir-title">Desativar cliente</h3>
            <p>
              Tem certeza que deseja desativar{' '}
              <strong>{confirmExcluir.nome}</strong> (matrícula{' '}
              {confirmExcluir.matricula})? O cliente sai da lista de vendas, mas
              o histórico permanece.
            </p>
            <div className="df-form-actions">
              <button
                type="button"
                className="btn btn-ghost"
                disabled={Boolean(busyId)}
                onClick={() => setConfirmExcluir(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-accent"
                disabled={Boolean(busyId)}
                onClick={() => void confirmarDesativar()}
              >
                {busyId ? (
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
    </div>
  )
}
