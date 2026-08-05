import { useTheme } from '../context/ThemeContext'

type BrandLogoProps = {
  /** full = ícone + wordmark · mark = só o símbolo */
  variant?: 'full' | 'mark'
  /** Tamanho visual pré-definido */
  size?: 'nav' | 'hero' | 'auth' | 'sidebar' | 'ops' | 'mark'
  className?: string
  /**
   * light = logo escura (fundo claro)
   * dark = logo clara (fundo escuro)
   * auto = segue o tema do app
   */
  tone?: 'auto' | 'light' | 'dark'
}

const SRC = {
  fullLight: '/logo-full-clear.png',
  fullDark: '/logo-full-on-dark.png',
  /** Ícone G oficial (sem fundo) — marca pessoal compacta */
  markLight: '/logo-g-mark.png',
  markDark: '/logo-g-mark.png',
} as const

/**
 * Logotipo oficial Glazia — preferir sempre isto a texto "GLAZIA".
 * Sem fundo branco; troca automaticamente a versão clara/escura.
 */
export function BrandLogo({
  variant = 'full',
  size = 'nav',
  className = '',
  tone = 'auto',
}: BrandLogoProps) {
  const { theme } = useTheme()
  const resolved =
    tone === 'auto' ? (theme === 'dark' ? 'dark' : 'light') : tone

  const src =
    variant === 'full'
      ? resolved === 'dark'
        ? SRC.fullDark
        : SRC.fullLight
      : resolved === 'dark'
        ? SRC.markDark
        : SRC.markLight

  const classes = [
    'brand-logo',
    `brand-logo-${variant}`,
    `brand-logo-${size}`,
    `brand-logo-tone-${resolved}`,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <img
      src={src}
      alt="Glazia"
      className={classes}
      draggable={false}
      decoding="async"
    />
  )
}
