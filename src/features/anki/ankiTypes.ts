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
}

