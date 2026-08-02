import type { TourAction } from './types'

export const TOUR_ACTION_EVENT = 'glazia:tour-action'

export function dispatchTourAction(action: TourAction) {
  window.dispatchEvent(
    new CustomEvent(TOUR_ACTION_EVENT, { detail: { action } }),
  )
}

export function onTourAction(handler: (action: TourAction) => void) {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ action: TourAction }>).detail
    if (detail?.action) handler(detail.action)
  }
  window.addEventListener(TOUR_ACTION_EVENT, listener)
  return () => window.removeEventListener(TOUR_ACTION_EVENT, listener)
}
