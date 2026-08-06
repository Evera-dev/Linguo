export interface Logger {
  debug: (message: string) => void
  info: (message: string) => void
  step: (message: string) => void
  success: (message: string) => void
  error: (message: string) => void
}

export const createLogger = (debugEnabled: boolean): Logger => ({
  debug: (message) => {
    if (debugEnabled) console.log(`  [debug] ${message}`)
  },
  info: (message) => console.log(message),
  step: (message) => console.log(`• ${message}`),
  success: (message) => console.log(`✓ ${message}`),
  error: (message) => console.error(`✗ ${message}`),
})
