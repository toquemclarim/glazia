import { Loader2, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { atualizarCliente, criarCliente } from '../services/api'
import type { Cliente, CriarClientePayload } from '../types'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: (cliente: Cliente) => void
  /** Se informado, o modal edita o cliente. */
  cliente?: Cliente | null
}

type FormState = {
  tipoPessoa: 'PF' | 'PJ'
  nome: string
  nomeCompleto: string
  razaoSocial: string
  nomeFantasia: string
  cpf: string
  cnpj: string
  rg: string
  inscricaoEstadual: string
  inscricaoMunicipal: string
  email: string
  telefone: string
  celular: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
  contatoNome: string
  observacao: string
}

const VAZIO: FormState = {
  tipoPessoa: 'PF',
  nome: '',
  nomeCompleto: '',
  razaoSocial: '',
  nomeFantasia: '',
  cpf: '',
  cnpj: '',
  rg: '',
  inscricaoEstadual: '',
  inscricaoMunicipal: '',
  email: '',
  telefone: '',
  celular: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  contatoNome: '',
  observacao: '',
}

function fromCliente(c: Cliente): FormState {
  return {
    tipoPessoa: c.tipoPessoa,
    nome: c.nome ?? '',
    nomeCompleto: c.nomeCompleto ?? '',
    razaoSocial: c.razaoSocial ?? '',
    nomeFantasia: c.nomeFantasia ?? '',
    cpf: c.cpf ?? '',
    cnpj: c.cnpj ?? '',
    rg: c.rg ?? '',
    inscricaoEstadual: c.inscricaoEstadual ?? '',
    inscricaoMunicipal: c.inscricaoMunicipal ?? '',
    email: c.email ?? '',
    telefone: c.telefone ?? '',
    celular: c.celular ?? '',
    cep: c.cep ?? '',
    logradouro: c.logradouro ?? '',
    numero: c.numero ?? '',
    complemento: c.complemento ?? '',
    bairro: c.bairro ?? '',
    cidade: c.cidade ?? '',
    uf: c.uf ?? '',
    contatoNome: c.contatoNome ?? '',
    observacao: c.observacao ?? '',
  }
}

function toPayload(f: FormState): CriarClientePayload {
  return {
    tipoPessoa: f.tipoPessoa,
    nome: f.nome.trim(),
    nomeCompleto: f.nomeCompleto.trim() || null,
    razaoSocial: f.razaoSocial.trim() || null,
    nomeFantasia: f.nomeFantasia.trim() || null,
    cpf: f.cpf.trim() || null,
    cnpj: f.cnpj.trim() || null,
    rg: f.rg.trim() || null,
    inscricaoEstadual: f.inscricaoEstadual.trim() || null,
    inscricaoMunicipal: f.inscricaoMunicipal.trim() || null,
    email: f.email.trim() || null,
    telefone: f.telefone.trim() || null,
    celular: f.celular.trim() || null,
    cep: f.cep.trim() || null,
    logradouro: f.logradouro.trim() || null,
    numero: f.numero.trim() || null,
    complemento: f.complemento.trim() || null,
    bairro: f.bairro.trim() || null,
    cidade: f.cidade.trim() || null,
    uf: f.uf.trim() || null,
    contatoNome: f.contatoNome.trim() || null,
    observacao: f.observacao.trim() || null,
  }
}

export function ClienteFormModal({
  open,
  onClose,
  onSaved,
  cliente = null,
}: Props) {
  const editando = Boolean(cliente)
  const [form, setForm] = useState<FormState>(VAZIO)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setErro(null)
    setForm(cliente ? fromCliente(cliente) : VAZIO)
  }, [open, cliente])

  if (!open) return null

  const set =
    (campo: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [campo]: e.target.value }))
    }

  const fechar = () => {
    if (saving) return
    onClose()
  }

  const salvar = async (e: FormEvent) => {
    e.preventDefault()
    setErro(null)
    if (form.nome.trim().length < 2) {
      setErro('Informe o nome do cliente')
      return
    }
    setSaving(true)
    try {
      const payload = toPayload(form)
      const salvo = editando
        ? await atualizarCliente(cliente!.id, payload)
        : await criarCliente(payload)
      onSaved(salvo)
      onClose()
    } catch (cause) {
      setErro(
        cause instanceof Error
          ? cause.message
          : editando
            ? 'Falha ao atualizar'
            : 'Falha ao cadastrar',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="df-drawer-backdrop" role="presentation" onClick={fechar}>
      <div
        className="df-drawer glass cliente-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cliente-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="df-drawer-head">
          <div>
            <h3 id="cliente-modal-title">
              {editando ? 'Editar cliente' : 'Novo cliente'}
            </h3>
            <p>
              Só o <strong>nome</strong> é obrigatório. Os demais dados podem
              ser preenchidos agora ou depois.
              {editando && cliente?.matricula
                ? ` · Matrícula ${cliente.matricula}`
                : ' A matrícula de 8 dígitos é gerada automaticamente.'}
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={fechar}
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </header>

        <form className="df-form" onSubmit={(e) => void salvar(e)}>
          <fieldset className="cliente-tipo-fieldset">
            <legend>Tipo de pessoa</legend>
            <div className="cliente-tipo-opcoes">
              <label className={form.tipoPessoa === 'PF' ? 'ativo' : ''}>
                <input
                  type="radio"
                  name="tipoPessoa"
                  checked={form.tipoPessoa === 'PF'}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, tipoPessoa: 'PF' }))
                  }
                />
                Pessoa física
              </label>
              <label className={form.tipoPessoa === 'PJ' ? 'ativo' : ''}>
                <input
                  type="radio"
                  name="tipoPessoa"
                  checked={form.tipoPessoa === 'PJ'}
                  onChange={() =>
                    setForm((prev) => ({ ...prev, tipoPessoa: 'PJ' }))
                  }
                />
                Pessoa jurídica
              </label>
            </div>
          </fieldset>

          <div className="field">
            <label htmlFor="cli-nome">
              Nome <span className="req">*</span>
            </label>
            <input
              id="cli-nome"
              value={form.nome}
              onChange={set('nome')}
              placeholder={
                form.tipoPessoa === 'PF'
                  ? 'Ex.: Maria Oliveira Silva'
                  : 'Ex.: Vidraçaria Horizonte'
              }
              required
              minLength={2}
              maxLength={160}
              autoFocus
            />
          </div>

          {form.tipoPessoa === 'PF' ? (
            <div className="df-form-row">
              <div className="field">
                <label htmlFor="cli-cpf">CPF</label>
                <input
                  id="cli-cpf"
                  value={form.cpf}
                  onChange={set('cpf')}
                  placeholder="000.000.000-00"
                  maxLength={18}
                />
              </div>
              <div className="field">
                <label htmlFor="cli-rg">RG</label>
                <input
                  id="cli-rg"
                  value={form.rg}
                  onChange={set('rg')}
                  maxLength={30}
                />
              </div>
            </div>
          ) : (
            <>
              <div className="field">
                <label htmlFor="cli-razao">Razão social</label>
                <input
                  id="cli-razao"
                  value={form.razaoSocial}
                  onChange={set('razaoSocial')}
                  placeholder="Como no contrato social"
                  maxLength={160}
                />
              </div>
              <div className="df-form-row">
                <div className="field">
                  <label htmlFor="cli-fantasia">Nome fantasia</label>
                  <input
                    id="cli-fantasia"
                    value={form.nomeFantasia}
                    onChange={set('nomeFantasia')}
                    maxLength={160}
                  />
                </div>
                <div className="field">
                  <label htmlFor="cli-cnpj">CNPJ</label>
                  <input
                    id="cli-cnpj"
                    value={form.cnpj}
                    onChange={set('cnpj')}
                    placeholder="00.000.000/0000-00"
                    maxLength={22}
                  />
                </div>
              </div>
              <div className="df-form-row">
                <div className="field">
                  <label htmlFor="cli-ie">Inscrição estadual</label>
                  <input
                    id="cli-ie"
                    value={form.inscricaoEstadual}
                    onChange={set('inscricaoEstadual')}
                    maxLength={30}
                  />
                </div>
                <div className="field">
                  <label htmlFor="cli-im">Inscrição municipal</label>
                  <input
                    id="cli-im"
                    value={form.inscricaoMunicipal}
                    onChange={set('inscricaoMunicipal')}
                    maxLength={30}
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="cli-contato">Contato / responsável</label>
                <input
                  id="cli-contato"
                  value={form.contatoNome}
                  onChange={set('contatoNome')}
                  maxLength={120}
                />
              </div>
            </>
          )}

          <div className="df-form-row">
            <div className="field">
              <label htmlFor="cli-email">E-mail</label>
              <input
                id="cli-email"
                type="email"
                value={form.email}
                onChange={set('email')}
                maxLength={160}
              />
            </div>
            <div className="field">
              <label htmlFor="cli-tel">Telefone</label>
              <input
                id="cli-tel"
                value={form.telefone}
                onChange={set('telefone')}
                maxLength={30}
              />
            </div>
            <div className="field">
              <label htmlFor="cli-cel">Celular</label>
              <input
                id="cli-cel"
                value={form.celular}
                onChange={set('celular')}
                maxLength={30}
              />
            </div>
          </div>

          <p className="cliente-section-label">Endereço</p>
          <div className="df-form-row">
            <div className="field" style={{ maxWidth: 140 }}>
              <label htmlFor="cli-cep">CEP</label>
              <input
                id="cli-cep"
                value={form.cep}
                onChange={set('cep')}
                maxLength={12}
              />
            </div>
            <div className="field">
              <label htmlFor="cli-log">Logradouro</label>
              <input
                id="cli-log"
                value={form.logradouro}
                onChange={set('logradouro')}
                maxLength={160}
              />
            </div>
            <div className="field" style={{ maxWidth: 100 }}>
              <label htmlFor="cli-num">Nº</label>
              <input
                id="cli-num"
                value={form.numero}
                onChange={set('numero')}
                maxLength={20}
              />
            </div>
          </div>
          <div className="df-form-row">
            <div className="field">
              <label htmlFor="cli-comp">Complemento</label>
              <input
                id="cli-comp"
                value={form.complemento}
                onChange={set('complemento')}
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="cli-bairro">Bairro</label>
              <input
                id="cli-bairro"
                value={form.bairro}
                onChange={set('bairro')}
                maxLength={80}
              />
            </div>
            <div className="field">
              <label htmlFor="cli-cidade">Cidade</label>
              <input
                id="cli-cidade"
                value={form.cidade}
                onChange={set('cidade')}
                maxLength={80}
              />
            </div>
            <div className="field" style={{ maxWidth: 80 }}>
              <label htmlFor="cli-uf">UF</label>
              <input
                id="cli-uf"
                value={form.uf}
                onChange={set('uf')}
                maxLength={2}
                placeholder="SP"
                style={{ textTransform: 'uppercase' }}
              />
            </div>
          </div>

          <div className="field">
            <label htmlFor="cli-obs">Observações</label>
            <textarea
              id="cli-obs"
              value={form.observacao}
              onChange={set('observacao')}
              rows={2}
              maxLength={500}
            />
          </div>

          {erro && (
            <p className="df-form-erro" role="alert">
              {erro}
            </p>
          )}

          <footer className="df-form-actions">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={fechar}
              disabled={saving}
            >
              Cancelar
            </button>
            <button type="submit" className="btn btn-accent" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="spin" size={16} /> Salvando…
                </>
              ) : editando ? (
                'Salvar alterações'
              ) : (
                'Cadastrar cliente'
              )}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
