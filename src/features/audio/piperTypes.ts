export interface PiperVoiceSummary {
  name: string
  language: string
  numSpeakers: number
}

export interface PiperAudio {
  filename: string
  data: string
}

export type PiperConnectionStatus = 'checking' | 'connected' | 'disconnected'

