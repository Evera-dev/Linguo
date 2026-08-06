import type { ParsedCard } from '../cards/cardTypes.ts'

export interface AnkiConnectResponse<T> {
  result: T
  error: string | null
}

export interface AnkiNote {
  deckName: string
  modelName: 'Basic'
  fields: {
    Front: string
    Back: string
  }
  options: {
    allowDuplicate: false
  }
  tags: string[]
  audio?: AnkiAudio
}

export interface AnkiAudio {
  filename: string
  data: string
  fields: ['Front']
}

export interface AnkiCanAddResult {
  canAdd: boolean
  error?: string
}

export type ImportFailureKind = 'duplicate' | 'invalid' | 'unknown'

export interface ImportFailure {
  cardId: ParsedCard['id']
  cardNumber: number
  front: string
  reason: string
  kind: ImportFailureKind
}

export interface ImportResult {
  added: number
  failed: number
  duplicates: number
  failures: ImportFailure[]
  syncStatus: 'not-attempted' | 'synced' | 'failed'
  syncError?: string
}

export type ImportPhase = 'validating' | 'generating-audio' | 'sending' | 'syncing'

export interface ImportProgress {
  phase: ImportPhase
  current: number
  total: number
}

export interface GeneratedAudio {
  filename: string
  data: string
}

export interface ImportCardsOptions {
  createAudio?: (card: ParsedCard) => Promise<GeneratedAudio>
  onProgress?: (progress: ImportProgress) => void
}
