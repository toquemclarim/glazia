import type { CorteEscolha } from '../utils/periodo'

const OPCOES: { id: CorteEscolha; titulo: string; detalhe: string }[] = [
  {
    id: '1',
    titulo: 'Do dia 1 ao último dia',
    detalhe: 'Calendário comum, de 1 a 30 ou 31.',
  },
  {
    id: '10',
    titulo: 'Do dia 10 ao dia 9',
    detalhe: 'O mês fecha no dia 9 do mês seguinte.',
  },
  {
    id: '15',
    titulo: 'Do dia 15 ao dia 14',
    detalhe: 'O mês fecha no dia 14 do mês seguinte.',
  },
  {
    id: 'outro',
    titulo: 'Outro dia',
    detalhe: 'Escolha um dia de 1 a 28.',
  },
]

export function CorteMesField({
  escolha,
  outro,
  onEscolha,
  onOutro,
  name = 'corte-mes',
}: {
  escolha: CorteEscolha | ''
  outro: string
  onEscolha: (escolha: CorteEscolha) => void
  onOutro: (valor: string) => void
  name?: string
}) {
  return (
    <div className="corte-mes">
      {OPCOES.map((opcao) => {
        const ativa = escolha === opcao.id
        return (
          <label
            key={opcao.id}
            className={`corte-mes-opcao${ativa ? ' ativa' : ''}`}
          >
            <input
              type="radio"
              name={name}
              checked={ativa}
              onChange={() => onEscolha(opcao.id)}
            />
            <span>
              <strong>{opcao.titulo}</strong>
              <span>{opcao.detalhe}</span>
              {opcao.id === 'outro' && ativa && (
                <input
                  className="corte-mes-dia"
                  type="number"
                  min={1}
                  max={28}
                  inputMode="numeric"
                  value={outro}
                  aria-label="Dia de início do mês"
                  onChange={(event) => onOutro(event.target.value)}
                />
              )}
            </span>
          </label>
        )
      })}
    </div>
  )
}
