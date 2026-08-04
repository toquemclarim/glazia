const PENDING_KEY = 'glazia-show-welcome'
const SEEN_PREFIX = 'glazia-welcome-seen:'

export function queueWelcomeScreen() {
  sessionStorage.setItem(PENDING_KEY, '1')
}

export function hasQueuedWelcome(): boolean {
  return sessionStorage.getItem(PENDING_KEY) === '1'
}

export function clearQueuedWelcome() {
  sessionStorage.removeItem(PENDING_KEY)
}

export function hasSeenWelcome(userId: string): boolean {
  return localStorage.getItem(`${SEEN_PREFIX}${userId}`) === '1'
}

export function markWelcomeSeen(userId: string) {
  localStorage.setItem(`${SEEN_PREFIX}${userId}`, '1')
  clearQueuedWelcome()
}
