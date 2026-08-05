import { Download, FileSpreadsheet, FileText, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { PainelSocios } from '../types'
import {
  exportarPainelExcel,
  exportarPainelPdf,
} from '../utils/exportReports'
import { PlanUpsellModal } from './PlanUpsellModal'

type Busy = null | 'pdf' | 'excel'

export function ExportButtons({
  painel,
  disabled,
}: {
  painel: PainelSocios | null
  disabled?: boolean
}) {
  const { podeExportar, usuario } = useApp()
  const [upsell, setUpsell] = useState(false)
  const [busy, setBusy] = useState<Busy>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!painel) return null

  const pedirUpgrade = () => setUpsell(true)
  const bloqueado = Boolean(disabled) || busy != null

  const flash = (msg: string) => {
    setFeedback(msg)
    window.setTimeout(() => setFeedback(null), 3200)
  }

  const onExcel = async () => {
    if (!podeExportar) {
      pedirUpgrade()
      return
    }
    setBusy('excel')
    try {
      await exportarPainelExcel(painel)
      flash('Planilha baixada')
    } catch {
      flash('Não foi possível gerar a planilha')
    } finally {
      setBusy(null)
    }
  }

  const onPdf = async () => {
    if (!podeExportar) {
      pedirUpgrade()
      return
    }
    setBusy('pdf')
    try {
      await exportarPainelPdf(painel, {
        empresaNome: usuario?.empresaNome,
      })
      flash('PDF baixado — pronto para enviar ou imprimir')
    } catch {
      flash('Não foi possível gerar o PDF')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div
        data-tour="export-buttons"
        className="export-actions"
      >
        <button
          type="button"
          data-tour="export-excel"
          className="btn btn-ghost"
          disabled={bloqueado && podeExportar}
          aria-busy={busy === 'excel'}
          onClick={() => {
            void onExcel()
          }}
        >
          {busy === 'excel' ? (
            <Loader2 size={16} className="spin" />
          ) : podeExportar ? (
            <FileSpreadsheet size={16} />
          ) : (
            <Lock size={16} />
          )}
          {busy === 'excel' ? 'Gerando…' : 'Excel'}
        </button>
        <button
          type="button"
          data-tour="export-pdf"
          className="btn btn-ghost"
          disabled={bloqueado && podeExportar}
          aria-busy={busy === 'pdf'}
          onClick={() => {
            void onPdf()
          }}
        >
          {busy === 'pdf' ? (
            <Loader2 size={16} className="spin" />
          ) : podeExportar ? (
            <FileText size={16} />
          ) : (
            <Lock size={16} />
          )}
          {busy === 'pdf' ? 'Montando PDF…' : 'PDF do mês'}
        </button>
        <span className="export-hint" role="status">
          {busy ? (
            <>
              <Loader2 size={14} className="spin" />
              Preparando arquivo…
            </>
          ) : feedback ? (
            feedback
          ) : (
            <>
              <Download size={14} />
              {podeExportar
                ? 'Mesmos números do painel'
                : 'Disponível no Standard e Pro'}
            </>
          )}
        </span>
      </div>
      <PlanUpsellModal
        open={upsell}
        feature="export"
        planoAtual={usuario?.plano}
        onClose={() => setUpsell(false)}
      />
    </>
  )
}
