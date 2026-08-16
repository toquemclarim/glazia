type Tone = 'sale' | 'cost'

function ink(tone: Tone) {
  return tone === 'sale' ? 'var(--success)' : 'var(--danger)'
}

function soft(tone: Tone) {
  return tone === 'sale' ? 'var(--success-soft)' : 'var(--danger-soft)'
}

function detectKind(kind: string) {
  const k = kind
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
  if (k.includes('PEDREIRO')) return 'PEDREIRO'
  if (k.includes('PEDAGIO')) return 'PEDAGIO'
  if (k.includes('EMBARC')) return 'EMBARCACAO'
  if (k.includes('ALUGUEL DE VEIC') || k.includes('ESTACION')) return 'VEICULO'
  if (k.includes('HOSPED')) return 'HOSPEDAGEM'
  if (
    k.includes('COMBUST') ||
    k.includes('GASOLINA') ||
    k.includes('DIESEL') ||
    k.includes('ETANOL') ||
    k.includes('ALCOOL') ||
    /(^| )GAS($| )/.test(k)
  ) {
    return 'COMBUSTIVEL'
  }
  if (
    k.includes('ALIMENT') ||
    k.includes('ALMOCO') ||
    k.includes('LANCHE') ||
    k.includes('JANTAR')
  ) {
    return 'ALIMENTACAO'
  }
  if (k.includes('PNEU') || k.includes('OLEO') || k.includes('LAVAGEM') || k.includes('MANUTENCAO VEIC')) {
    return 'MANUTENCAO'
  }
  if (k.includes('UBER') || k.includes('TAXI') || k.includes('MOTOFRETE') || k.includes('TRANSPORTE')) {
    return 'TRANSPORTE'
  }
  if (k.includes('OUTROS')) return 'OUTROS'
  if (k.includes('PARAFUS') || k.includes('FERRAG') || k.includes('ROLDANA') || k.includes('DOBRADI') || k.includes('PUXADOR') || k.includes('FECHO') || k.includes('PIVO')) {
    return 'PARAFUSO'
  }
  if (k.includes('PERFIL') || k.includes('TRILHO')) return 'PERFIL'
  if (k.includes('SILICONE')) return 'SILICONE'
  if (k.includes('ESPELHO') || k.includes('TAMPO') || k.includes('PRATELEIRA')) return 'VIDRO'
  if (k.includes('VIDRO') || k.includes('TEMPER') || k.includes('LAMIN') || k.includes('FLOAT')) {
    return 'VIDRO'
  }
  if (k.includes('BOX')) return 'BOX'
  if (k.includes('GUARDA')) return 'GUARDA'
  if (k.includes('FACHADA') || k.includes('PELE')) return 'FACHADA'
  if (k.includes('PORTA')) return 'PORTA'
  if (k.includes('MAXIMAR') || k.includes('TOMBANTE') || k.includes('BASCUL')) return 'MAXIMAR'
  if (k.includes('JANELA') || k.includes('VENEZIANA')) return 'JANELA'
  if (k.includes('SERVICO') || k.includes('CONSUM') || k.includes('TERCEIRIZ')) return 'SERVICO'
  if (k.includes('TAXAS DE VIAGEM')) return 'VEICULO'
  return 'JANELA'
}

export function ItemPreview({
  kind,
  label,
  tone,
  index = 0,
}: {
  kind: string
  label: string
  tone: Tone
  index?: number
}) {
  const variant = detectKind(kind)
  const stroke = ink(tone)
  const fill = soft(tone)

  return (
    <div className={`lanc-preview-card ${tone}`}>
      <p className="lanc-preview-eyebrow">Projeção {index + 1}</p>
      <div className="lanc-preview-art">
        <svg
          viewBox="0 0 220 180"
          role="img"
          aria-label={label}
          style={{ animationDelay: `${index * 0.35}s` }}
        >
          <defs>
            <linearGradient id={`glassShine-${index}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
              <stop offset="55%" stopColor="rgba(255,255,255,0.05)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>

          {variant === 'JANELA' && (
            <SvgJanela stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />
          )}
          {variant === 'PORTA' && (
            <SvgPorta stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />
          )}
          {variant === 'BOX' && (
            <SvgBox stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />
          )}
          {variant === 'MAXIMAR' && (
            <SvgMaximar stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />
          )}
          {variant === 'GUARDA' && (
            <SvgGuarda stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />
          )}
          {variant === 'FACHADA' && (
            <SvgFachada stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />
          )}
          {variant === 'VIDRO' && (
            <SvgVidro stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />
          )}
          {variant === 'PARAFUSO' && <SvgParafuso stroke={stroke} fill={fill} />}
          {variant === 'PERFIL' && (
            <SvgPerfil stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />
          )}
          {variant === 'SILICONE' && (
            <SvgSilicone stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />
          )}
          {variant === 'SERVICO' && <SvgServico stroke={stroke} fill={fill} />}
          {variant === 'PEDREIRO' && <SvgPedreiro stroke={stroke} fill={fill} />}
          {variant === 'PEDAGIO' && <SvgPedagio stroke={stroke} fill={fill} />}
          {variant === 'EMBARCACAO' && <SvgEmbarcacao stroke={stroke} fill={fill} shineId={`glassShine-${index}`} />}
          {variant === 'VEICULO' && <SvgVeiculo stroke={stroke} fill={fill} />}
          {variant === 'HOSPEDAGEM' && <SvgHospedagem stroke={stroke} fill={fill} />}
          {variant === 'COMBUSTIVEL' && <SvgCombustivel stroke={stroke} fill={fill} />}
          {variant === 'ALIMENTACAO' && <SvgAlimentacao stroke={stroke} fill={fill} />}
          {variant === 'MANUTENCAO' && <SvgManutencao stroke={stroke} fill={fill} />}
          {variant === 'TRANSPORTE' && <SvgTransporte stroke={stroke} fill={fill} />}
          {variant === 'OUTROS' && <SvgOutros stroke={stroke} fill={fill} />}
        </svg>
      </div>
      <p className="lanc-preview-label">{label || '—'}</p>
    </div>
  )
}

type SvgProps = { stroke: string; fill: string; shineId?: string }

function SvgJanela({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <rect x="48" y="28" width="124" height="120" rx="6" fill={fill} stroke={stroke} strokeWidth="3" />
      <line x1="110" y1="28" x2="110" y2="148" stroke={stroke} strokeWidth="2.5" />
      <line x1="48" y1="88" x2="172" y2="88" stroke={stroke} strokeWidth="2.5" />
      <path d="M58 40 H100 V78 H58 Z" fill={`url(#${shineId})`} opacity="0.9" />
      <rect x="40" y="148" width="140" height="8" rx="2" fill={stroke} opacity="0.35" />
    </g>
  )
}

function SvgPorta({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <rect x="70" y="22" width="80" height="130" rx="4" fill={fill} stroke={stroke} strokeWidth="3" />
      <rect x="82" y="36" width="56" height="70" rx="2" fill={`url(#${shineId})`} stroke={stroke} strokeWidth="1.5" />
      <circle cx="132" cy="100" r="4" fill={stroke} />
      <rect x="60" y="150" width="100" height="8" rx="2" fill={stroke} opacity="0.35" />
    </g>
  )
}

function SvgBox({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <path d="M40 40 H150 L180 70 V150 H40 Z" fill={fill} stroke={stroke} strokeWidth="3" />
      <line x1="150" y1="40" x2="150" y2="150" stroke={stroke} strokeWidth="2" />
      <path d="M52 52 H138 V138 H52 Z" fill={`url(#${shineId})`} />
      <circle cx="138" cy="100" r="3.5" fill={stroke} />
    </g>
  )
}

function SvgMaximar({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <rect x="50" y="50" width="120" height="90" rx="4" fill={fill} stroke={stroke} strokeWidth="3" />
      <path d="M50 50 L110 28 L170 50" fill={fill} stroke={stroke} strokeWidth="3" />
      <path d="M62 58 H158 V128 H62 Z" fill={`url(#${shineId})`} />
    </g>
  )
}

function SvgGuarda({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <rect x="30" y="50" width="160" height="70" rx="3" fill={fill} stroke={stroke} strokeWidth="2.5" />
      <path d="M30 50 H190" stroke={stroke} strokeWidth="4" />
      <path d="M40 120 V150 M70 120 V150 M100 120 V150 M130 120 V150 M160 120 V150 M180 120 V150" stroke={stroke} strokeWidth="3" />
      <path d="M40 55 H180 V110 H40 Z" fill={`url(#${shineId})`} opacity="0.7" />
    </g>
  )
}

function SvgFachada({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <rect x="35" y="25" width="150" height="130" rx="4" fill={fill} stroke={stroke} strokeWidth="3" />
      <line x1="85" y1="25" x2="85" y2="155" stroke={stroke} strokeWidth="2" />
      <line x1="135" y1="25" x2="135" y2="155" stroke={stroke} strokeWidth="2" />
      <line x1="35" y1="70" x2="185" y2="70" stroke={stroke} strokeWidth="2" />
      <line x1="35" y1="115" x2="185" y2="115" stroke={stroke} strokeWidth="2" />
      <path d="M42 32 H78 V62 H42 Z" fill={`url(#${shineId})`} />
    </g>
  )
}

function SvgVidro({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <rect x="55" y="35" width="110" height="110" rx="8" fill={fill} stroke={stroke} strokeWidth="3" transform="rotate(-6 110 90)" />
      <path d="M70 50 H145 V130 H70 Z" fill={`url(#${shineId})`} transform="rotate(-6 110 90)" />
      <line x1="70" y1="55" x2="140" y2="125" stroke={stroke} strokeWidth="1.2" opacity="0.35" transform="rotate(-6 110 90)" />
    </g>
  )
}

function SvgParafuso({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g>
      <rect x="98" y="28" width="24" height="18" rx="3" fill={stroke} />
      <rect x="104" y="46" width="12" height="90" rx="3" fill={fill} stroke={stroke} strokeWidth="2" />
      <path d="M104 136 L110 156 L116 136 Z" fill={stroke} />
      <line x1="104" y1="60" x2="116" y2="60" stroke={stroke} strokeWidth="1.5" />
      <line x1="104" y1="75" x2="116" y2="75" stroke={stroke} strokeWidth="1.5" />
      <line x1="104" y1="90" x2="116" y2="90" stroke={stroke} strokeWidth="1.5" />
      <line x1="104" y1="105" x2="116" y2="105" stroke={stroke} strokeWidth="1.5" />
    </g>
  )
}

function SvgPerfil({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <path
        d="M40 70 H180 V110 H150 V95 H90 V110 H40 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="3"
      />
      <path d="M55 78 H80 V102 H55 Z" fill={`url(#${shineId})`} />
    </g>
  )
}

function SvgSilicone({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <rect x="85" y="30" width="50" height="100" rx="10" fill={fill} stroke={stroke} strokeWidth="3" />
      <path d="M100 30 L110 12 L120 30" fill={stroke} />
      <rect x="95" y="50" width="30" height="50" rx="4" fill={`url(#${shineId})`} />
      <ellipse cx="110" cy="145" rx="18" ry="8" fill={stroke} opacity="0.35" />
    </g>
  )
}

function SvgServico({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g>
      <circle cx="110" cy="90" r="48" fill={fill} stroke={stroke} strokeWidth="3" />
      <path
        d="M90 90 l12 12 28-34"
        fill="none"
        stroke={stroke}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

function SvgPedreiro({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g>
      <ellipse cx="110" cy="48" rx="28" ry="10" fill={stroke} className="preview-bob" />
      <path d="M82 48 Q110 78 138 48" fill={fill} stroke={stroke} strokeWidth="3" className="preview-bob" />
      <circle cx="110" cy="92" r="16" fill={fill} stroke={stroke} strokeWidth="2.5" />
      <path d="M86 150 Q110 118 134 150" fill="none" stroke={stroke} strokeWidth="3" />
      <rect x="72" y="118" width="18" height="36" rx="3" fill={stroke} className="preview-swing" />
    </g>
  )
}

function SvgPedagio({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g>
      <rect x="36" y="118" width="148" height="14" rx="3" fill={stroke} opacity="0.35" />
      <rect x="48" y="42" width="16" height="90" rx="3" fill={stroke} />
      <rect x="156" y="42" width="16" height="90" rx="3" fill={stroke} />
      <rect x="48" y="36" width="124" height="12" rx="3" fill={fill} stroke={stroke} strokeWidth="2" />
      <g className="preview-toll">
        <rect x="64" y="62" width="88" height="8" rx="3" fill={stroke} />
      </g>
    </g>
  )
}

function SvgEmbarcacao({ stroke, fill, shineId }: SvgProps) {
  return (
    <g>
      <path d="M40 118 L70 78 H150 L180 118 Z" fill={fill} stroke={stroke} strokeWidth="3" />
      <path d="M78 78 V46 H128" fill="none" stroke={stroke} strokeWidth="3" />
      <path d="M80 48 L126 48 L126 74 H80 Z" fill={`url(#${shineId})`} stroke={stroke} strokeWidth="1.5" className="preview-sail" />
      <path d="M30 132 Q110 148 190 132" fill="none" stroke={stroke} strokeWidth="3" className="preview-wave" />
    </g>
  )
}

function SvgVeiculo({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g className="preview-drive">
      <path d="M48 108 H172 L158 80 H92 L78 108 Z" fill={fill} stroke={stroke} strokeWidth="3" />
      <path d="M96 80 L108 58 H146 L158 80" fill={fill} stroke={stroke} strokeWidth="2.5" />
      <circle cx="78" cy="118" r="12" fill={stroke} />
      <circle cx="148" cy="118" r="12" fill={stroke} />
      <circle cx="78" cy="118" r="5" fill={fill} />
      <circle cx="148" cy="118" r="5" fill={fill} />
    </g>
  )
}

function SvgHospedagem({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g>
      <rect x="48" y="48" width="124" height="90" rx="6" fill={fill} stroke={stroke} strokeWidth="3" />
      <path d="M40 48 L110 22 L180 48" fill={fill} stroke={stroke} strokeWidth="3" />
      <rect x="70" y="70" width="22" height="22" rx="2" fill={stroke} opacity="0.35" className="preview-window" />
      <rect x="128" y="70" width="22" height="22" rx="2" fill={stroke} opacity="0.35" className="preview-window" />
      <rect x="96" y="98" width="28" height="40" rx="2" fill={stroke} />
    </g>
  )
}

function SvgCombustivel({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g>
      <rect x="58" y="40" width="70" height="100" rx="8" fill={fill} stroke={stroke} strokeWidth="3" />
      <rect x="70" y="54" width="46" height="36" rx="4" fill={stroke} opacity="0.25" />
      <path d="M128 58 H150 Q164 58 164 74 V118" fill="none" stroke={stroke} strokeWidth="4" strokeLinecap="round" className="preview-hose" />
      <circle cx="164" cy="128" r="8" fill={stroke} className="preview-drip" />
    </g>
  )
}

function SvgAlimentacao({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g>
      <ellipse cx="110" cy="108" rx="58" ry="18" fill={fill} stroke={stroke} strokeWidth="3" />
      <ellipse cx="110" cy="98" rx="42" ry="28" fill={fill} stroke={stroke} strokeWidth="2.5" className="preview-steam" />
      <path d="M168 58 L188 130" stroke={stroke} strokeWidth="4" strokeLinecap="round" />
      <path d="M176 70 Q198 86 178 108" fill="none" stroke={stroke} strokeWidth="3" />
    </g>
  )
}

function SvgManutencao({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g>
      <circle cx="110" cy="92" r="42" fill={fill} stroke={stroke} strokeWidth="8" className="preview-spin-slow" />
      <circle cx="110" cy="92" r="14" fill={stroke} />
      <path d="M110 50 V70 M110 114 V134 M68 92 H88 M132 92 H152" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
    </g>
  )
}

function SvgTransporte({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g className="preview-drive">
      <rect x="52" y="70" width="116" height="42" rx="12" fill={fill} stroke={stroke} strokeWidth="3" />
      <circle cx="80" cy="122" r="10" fill={stroke} />
      <circle cx="140" cy="122" r="10" fill={stroke} />
      <path d="M70 70 Q110 40 150 70" fill="none" stroke={stroke} strokeWidth="3" />
    </g>
  )
}

function SvgOutros({ stroke, fill }: { stroke: string; fill: string }) {
  return (
    <g>
      <rect x="58" y="42" width="104" height="96" rx="10" fill={fill} stroke={stroke} strokeWidth="3" className="preview-bob" />
      <path d="M86 88 h48 M110 64 v48" stroke={stroke} strokeWidth="5" strokeLinecap="round" />
    </g>
  )
}
