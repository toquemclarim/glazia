/** Controle centralizado de assinatura / trial. */

export const TRIAL_DIAS = 14;

export const STATUS_EMPRESA = [
  'ativa',
  'trial',
  'inativa',
  'suspensa',
  'cancelada',
] as const;

export type StatusAssinatura = (typeof STATUS_EMPRESA)[number];

/** Status em que a empresa ainda opera o produto. */
export function empresaOperacional(
  status: string | null | undefined,
): boolean {
  return status === 'ativa' || status === 'trial';
}

/** Autenticar é permitido; acesso às funcionalidades não. */
export function empresaBloqueada(
  status: string | null | undefined,
): boolean {
  return (
    status === 'inativa' ||
    status === 'suspensa' ||
    status === 'cancelada'
  );
}

export function trialFimFrom(inicio: Date = new Date()): Date {
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + TRIAL_DIAS);
  return fim;
}

export function diasRestantesTrial(
  trialFim: string | Date | null | undefined,
  agora = new Date(),
): number | null {
  if (!trialFim) return null;
  const fim = trialFim instanceof Date ? trialFim : new Date(trialFim);
  if (Number.isNaN(fim.getTime())) return null;
  const ms = fim.getTime() - agora.getTime();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export function trialExpirado(
  trialFim: string | Date | null | undefined,
  agora = new Date(),
): boolean {
  if (!trialFim) return false;
  const fim = trialFim instanceof Date ? trialFim : new Date(trialFim);
  if (Number.isNaN(fim.getTime())) return false;
  return fim.getTime() <= agora.getTime();
}
