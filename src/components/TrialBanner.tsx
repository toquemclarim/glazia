import { useApp } from '../context/AppContext'

export function TrialBanner() {
  const { emTrial, trialDiasRestantes } = useApp()
  if (!emTrial) return null

  const dias =
    trialDiasRestantes == null
      ? null
      : Math.max(0, trialDiasRestantes)

  return (
    <div className="trial-banner" role="status">
      Você está utilizando o Trial.
      {dias == null
        ? null
        : dias === 0
          ? ' Encerra hoje.'
          : ` Restam ${dias} dia${dias === 1 ? '' : 's'}.`}
    </div>
  )
}
