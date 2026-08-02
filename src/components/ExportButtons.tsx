import { Download, FileSpreadsheet, FileText, Lock } from 'lucide-react'
import { useState } from 'react'
import { useApp } from '../context/AppContext'
import type { PainelSocios } from '../types'
import {
  exportarPainelExcel,
  exportarPainelPdf,
} from '../utils/exportReports'
import { PlanUpsellModal } from './PlanUpsellModal'

export function ExportButtons({
  painel,
  disabled,
}: {
  painel: PainelSocios | null
  disabled?: boolean
}) {
  const { podeExportar, usuario } = useApp()
  const [upsell, setUpsell] = useState(false)

  if (!painel) return null

  const pedirUpgrade = () => setUpsell(true)

  return (
    <>
      <div
        data-tour="export-buttons"
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}
      >
        <button
          type="button"
          data-tour="export-excel"
          className="btn btn-ghost"
          disabled={disabled && podeExportar}
          onClick={() => {
            if (!podeExportar) {
              pedirUpgrade()
              return
            }
            void exportarPainelExcel(painel)
          }}
        >
          {podeExportar ? (
            <FileSpreadsheet size={16} />
          ) : (
            <Lock size={16} />
          )}
          Excel
        </button>
        <button
          type="button"
          data-tour="export-pdf"
          className="btn btn-ghost"
          disabled={disabled && podeExportar}
          onClick={() => {
            if (!podeExportar) {
              pedirUpgrade()
              return
            }
            void exportarPainelPdf(painel)
          }}
        >
          {podeExportar ? <FileText size={16} /> : <Lock size={16} />}
          PDF
        </button>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
          }}
        >
          <Download size={14} />
          {podeExportar
            ? 'Mesmos dados do painel'
            : 'Disponível no Standard e Pro'}
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
