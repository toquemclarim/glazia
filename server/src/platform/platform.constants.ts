import { PLANOS, type PlanoAssinatura } from '../billing/plan.entitlements';
import {
  STATUS_EMPRESA,
  type StatusAssinatura,
} from '../billing/subscription';

/** Tenant interno do console Ops — nunca listado como cliente. */
export const PLATFORM_EMPRESA_ID = 'glazia-platform';

export { PLANOS, STATUS_EMPRESA, type PlanoAssinatura, type StatusAssinatura };

export const PLANO_LABEL: Record<PlanoAssinatura, string> = {
  TRIAL: 'Trial',
  BASIC: 'Basic',
  STANDARD: 'Standard',
  PRO: 'Pro',
};
