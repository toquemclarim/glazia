import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { LINHAS, MATERIAIS, PRODUTOS, type TipoMovimento } from '../types'
import { formatCurrency, formatDate } from '../utils/format'

export function Lancamentos() {
  const {
    lancamentos,
    addLancamento,
    removeLancamento,
    error,
  } = useApp()
  const [tipo, setTipo] = useState<TipoMovimento>('entrada')
  const [linha, setLinha] = useState(LINHAS[0])
  const [produto, setProduto] = useState(PRODUTOS[0])
  const [cliente, setCliente] = useState('')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [material, setMaterial] = useState(MATERIAIS[0])
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [ok, setOk] = useState(false)

  const reset = () => {
    setCliente('')
    setDescricao('')
    setValor('')
    setData(new Date().toISOString().slice(0, 10))
    setOk(true)
    setTimeout(() => setOk(false), 2200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = Number(valor.replace(',', '.'))
    if (!cliente.trim() || !num || num <= 0) return

    try {
      await addLancamento({
        tipo,
        linha,
        produto,
        cliente: cliente.trim(),
        descricao: descricao.trim() || `${produto} — ${linha}`,
        valor: num,
        material: tipo === 'saida' ? material : undefined,
        data,
      })
      reset()
    } catch {
      // O contexto expõe a mensagem segura retornada pela API.
    }
  }

  return (
    <div>
      <div className="glass fade-up" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="panel-header">
          <h2>Novo lançamento</h2>
          {ok && (
            <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>
              Lançamento registrado
            </span>
          )}
          {error && (
            <span style={{ color: 'var(--danger)', fontSize: '0.85rem', fontWeight: 600 }}>
              {error}
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="field full">
              <label>Tipo</label>
              <div className="tipo-toggle">
                <button
                  type="button"
                  className={`tipo-btn${tipo === 'entrada' ? ' active-in' : ''}`}
                  onClick={() => setTipo('entrada')}
                >
                  Entrada
                </button>
                <button
                  type="button"
                  className={`tipo-btn${tipo === 'saida' ? ' active-out' : ''}`}
                  onClick={() => setTipo('saida')}
                >
                  Saída
                </button>
              </div>
            </div>

            <div className="field">
              <label htmlFor="linha">Linha</label>
              <select id="linha" value={linha} onChange={(e) => setLinha(e.target.value as typeof linha)}>
                {LINHAS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="produto">Produto</label>
              <select id="produto" value={produto} onChange={(e) => setProduto(e.target.value as typeof produto)}>
                {PRODUTOS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label htmlFor="cliente">Cliente</label>
              <input
                id="cliente"
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                placeholder="Nome do cliente ou obra"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="valor">Valor (R$)</label>
              <input
                id="valor"
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="data">Data</label>
              <input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>

            {tipo === 'saida' && (
              <div className="field">
                <label htmlFor="material">Material</label>
                <select id="material" value={material} onChange={(e) => setMaterial(e.target.value)}>
                  {MATERIAIS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            )}

            <div className={`field${tipo === 'entrada' ? ' full' : ''}`}>
              <label htmlFor="desc">Descrição</label>
              <input
                id="desc"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes do serviço ou compra"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-accent">
              Registrar {tipo === 'entrada' ? 'entrada' : 'saída'}
            </button>
          </div>
        </form>
      </div>

      <div className="glass fade-up fade-up-delay-1" style={{ padding: '1.25rem' }}>
        <div className="panel-header">
          <h2>Histórico recente</h2>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {lancamentos.length} registros
          </span>
        </div>

        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Cliente</th>
                <th>Linha</th>
                <th>Produto</th>
                <th>Valor</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lancamentos.slice(0, 40).map((l) => (
                <tr key={l.id}>
                  <td>{formatDate(l.data)}</td>
                  <td>
                    <span className={`badge ${l.tipo === 'entrada' ? 'badge-in' : 'badge-out'}`}>
                      {l.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                    </span>
                  </td>
                  <td>{l.cliente}</td>
                  <td>{l.linha}</td>
                  <td>{l.produto}</td>
                  <td style={{ fontWeight: 600, color: l.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)' }}>
                    {l.tipo === 'entrada' ? '+' : '−'} {formatCurrency(l.valor)}
                  </td>
                  <td>
                    <button
                      className="btn-icon"
                      onClick={() => void removeLancamento(l.id)}
                      aria-label="Excluir"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
