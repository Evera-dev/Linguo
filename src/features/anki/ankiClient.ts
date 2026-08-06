import type { ParsedCard } from '../cards/cardTypes.ts'
import type {
  AnkiCanAddResult,
  AnkiConnectResponse,
  AnkiNote,
  GeneratedAudio,
  ImportCardsOptions,
  ImportFailure,
  ImportFailureKind,
  ImportResult,
} from './ankiTypes.ts'

const ANKI_CONNECT_URL = 'http://127.0.0.1:8765'
const ANKI_CONNECT_VERSION = 6
const REQUEST_TIMEOUT_MS = 8_000
const IMPORT_TIMEOUT_MS = 60_000
const SYNC_TIMEOUT_MS = 120_000

type ErrorKind = 'connection' | 'http' | 'response' | 'api'

export class AnkiConnectError extends Error {
  readonly kind: ErrorKind

  constructor(
    kind: ErrorKind,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AnkiConnectError'
    this.kind = kind
  }
}

const isAnkiResponse = (value: unknown): value is AnkiConnectResponse<unknown> => {
  if (!value || typeof value !== 'object') return false
  return 'result' in value && 'error' in value
}

export async function invoke<T>(
  action: string,
  version = ANKI_CONNECT_VERSION,
  params?: Record<string, unknown>,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(ANKI_CONNECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, version, ...(params ? { params } : {}) }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new AnkiConnectError('http', `AnkiConnect responded with HTTP ${response.status}.`)
    }

    let payload: unknown
    try {
      payload = await response.json()
    } catch (error) {
      throw new AnkiConnectError('response', 'AnkiConnect returned malformed JSON.', { cause: error })
    }

    if (!isAnkiResponse(payload)) {
      throw new AnkiConnectError('response', 'AnkiConnect returned an unexpected response shape.')
    }

    if (payload.error) {
      throw new AnkiConnectError('api', payload.error)
    }

    return payload.result as T
  } catch (error) {
    if (error instanceof AnkiConnectError) throw error
    throw new AnkiConnectError('connection', 'The request to AnkiConnect could not be completed.', {
      cause: error,
    })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const checkAnkiConnection = async (): Promise<void> => {
  const version = await invoke<number>('version')
  if (typeof version !== 'number') {
    throw new AnkiConnectError('response', 'AnkiConnect returned an invalid version.')
  }
}

export const getDeckNames = async (): Promise<string[]> => {
  const decks = await invoke<unknown>('deckNames')
  if (!Array.isArray(decks) || !decks.every((deck) => typeof deck === 'string')) {
    throw new AnkiConnectError('response', 'AnkiConnect returned an invalid deck list.')
  }
  return [...decks].sort((left, right) => left.localeCompare(right))
}

export const syncAnki = async (): Promise<void> => {
  await invoke<unknown>('sync', ANKI_CONNECT_VERSION, undefined, SYNC_TIMEOUT_MS)
}

const escapeHtml = (value: string): string =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
    .replaceAll('\n', '<br />')

export const cardToAnkiNote = (card: ParsedCard, deckName: string): AnkiNote => {
  const backSections = [`<div>${escapeHtml(card.back)}</div>`]
  if (card.example) {
    backSections.push('<hr />', `<div><strong>Example:</strong> ${escapeHtml(card.example)}</div>`)
  }
  if (card.notes) {
    backSections.push(`<div><strong>Notes:</strong> ${escapeHtml(card.notes)}</div>`)
  }

  return {
    deckName,
    modelName: 'Basic',
    fields: {
      Front: escapeHtml(card.front),
      Back: backSections.join('\n'),
    },
    options: { allowDuplicate: false },
    tags: card.tags,
  }
}

export const attachAudioToAnkiNote = (note: AnkiNote, audio: GeneratedAudio): AnkiNote => ({
  ...note,
  audio: { ...audio, fields: ['Front'] },
})

const classifyFailure = (reason: string): ImportFailureKind => {
  const normalizedReason = reason.toLowerCase()
  if (normalizedReason.includes('duplicate')) return 'duplicate'
  if (normalizedReason.includes('field') || normalizedReason.includes('note')) return 'invalid'
  return 'unknown'
}

const createFailure = (card: ParsedCard, cardNumber: number, reason: string): ImportFailure => ({
  cardId: card.id,
  cardNumber,
  front: card.front,
  reason,
  kind: classifyFailure(reason),
})

export const importCards = async (
  cards: ParsedCard[],
  deckName: string,
  options: ImportCardsOptions = {},
): Promise<ImportResult> => {
  if (!deckName) throw new Error('Select a deck before importing.')
  if (cards.length === 0) throw new Error('There are no cards to import.')

  const invalidCard = cards.find((card) => card.errors.length > 0)
  if (invalidCard) throw new Error(invalidCard.errors[0])

  const notes = cards.map((card) => cardToAnkiNote(card, deckName))
  let eligibleIndexes = cards.map((_, index) => index)
  const failures: ImportFailure[] = []
  options.onProgress?.({ phase: 'validating', current: 0, total: cards.length })

  try {
    const checks = await invoke<AnkiCanAddResult[]>('canAddNotesWithErrorDetail', undefined, { notes })
    if (Array.isArray(checks) && checks.length === cards.length) {
      eligibleIndexes = checks.flatMap((check, index) => {
        if (check.canAdd) return [index]
        const reason = check.error?.trim() || 'Anki rejected this card.'
        failures.push(createFailure(cards[index], index + 1, reason))
        return []
      })
    }
  } catch (error) {
    console.warn('Anki preflight validation was unavailable; continuing with addNotes.', error)
  }

  if (eligibleIndexes.length > 0) {
    if (options.createAudio) {
      options.onProgress?.({
        phase: 'generating-audio',
        current: 0,
        total: eligibleIndexes.length,
      })
      for (const [progressIndex, cardIndex] of eligibleIndexes.entries()) {
        const audio = await options.createAudio(cards[cardIndex])
        notes[cardIndex] = attachAudioToAnkiNote(notes[cardIndex], audio)
        options.onProgress?.({
          phase: 'generating-audio',
          current: progressIndex + 1,
          total: eligibleIndexes.length,
        })
      }
    }

    options.onProgress?.({ phase: 'sending', current: 0, total: eligibleIndexes.length })
    const eligibleNotes = eligibleIndexes.map((index) => notes[index])
    const addedNoteIds = await invoke<Array<number | null>>(
      'addNotes',
      undefined,
      { notes: eligibleNotes },
      IMPORT_TIMEOUT_MS,
    )

    if (!Array.isArray(addedNoteIds) || addedNoteIds.length !== eligibleNotes.length) {
      throw new AnkiConnectError('response', 'AnkiConnect returned an invalid import result.')
    }

    addedNoteIds.forEach((noteId, resultIndex) => {
      if (noteId === null) {
        const cardIndex = eligibleIndexes[resultIndex]
        failures.push(
          createFailure(cards[cardIndex], cardIndex + 1, 'Anki could not add this card. It may be a duplicate.'),
        )
      }
    })
  }

  const duplicates = failures.filter((failure) => failure.kind === 'duplicate').length
  return {
    added: cards.length - failures.length,
    failed: failures.length,
    duplicates,
    failures: failures.sort((left, right) => left.cardNumber - right.cardNumber),
    syncStatus: 'not-attempted',
  }
}

export const getAnkiSyncErrorMessage = (error: unknown): string => {
  console.error('AnkiWeb sync error:', error)

  if (error instanceof AnkiConnectError) {
    if (error.kind === 'connection') {
      return 'The cards were added, but AnkiWeb sync could not start. Check your connection and sync from Anki.'
    }
    if (error.kind === 'api') {
      return `The cards were added, but AnkiWeb sync failed: ${error.message}`
    }
  }

  return 'The cards were added, but AnkiWeb sync could not be completed. Try syncing from Anki.'
}

export const getAnkiErrorMessage = (error: unknown): string => {
  console.error('AnkiConnect error:', error)

  if (error instanceof AnkiConnectError) {
    if (error.kind === 'connection') {
      return 'Could not connect to Anki. Make sure Anki is open, AnkiConnect is installed, and your browser allows local connections.'
    }
    if (error.kind === 'response' || error.kind === 'http') {
      return 'AnkiConnect returned an invalid response. Restart Anki and try again.'
    }
    return `AnkiConnect could not complete the request: ${error.message}`
  }

  if (error instanceof Error && error.message) return error.message
  return 'Something unexpected happened while communicating with Anki.'
}
