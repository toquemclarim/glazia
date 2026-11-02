export const APP_VERSION = 'G2.0'

export function AppVersion({ className = '' }: { className?: string }) {
  return (
    <span
      className={`app-version${className ? ` ${className}` : ''}`}
      title="Versão atual do Glazia"
    >
      Versão {APP_VERSION}
    </span>
  )
}
