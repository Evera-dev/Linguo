import type { PiperAudio, PiperVoiceSummary } from './piperTypes.ts'

const PIPER_BASE_URL = '/piper'
const CONNECTION_TIMEOUT_MS = 5_000
const SYNTHESIS_TIMEOUT_MS = 60_000

type PiperErrorKind = 'connection' | 'http' | 'response' | 'synthesis'

export class PiperError extends Error {
  readonly kind: PiperErrorKind

  constructor(kind: PiperErrorKind, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'PiperError'
    this.kind = kind
  }
}

const fetchWithTimeout = async (
  input: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } catch (error) {
    throw new PiperError('connection', 'The request to Piper could not be completed.', { cause: error })
  } finally {
    window.clearTimeout(timeoutId)
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const getPiperInfo = async (): Promise<PiperVoiceSummary> => {
  const response = await fetchWithTimeout(`${PIPER_BASE_URL}/info`, { method: 'GET' }, CONNECTION_TIMEOUT_MS)
  if (!response.ok) throw new PiperError('http', `Piper responded with HTTP ${response.status}.`)

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new PiperError('response', 'Piper returned malformed JSON.', { cause: error })
  }

  if (!isRecord(payload) || !isRecord(payload.voice)) {
    throw new PiperError('response', 'Piper returned an unexpected response.')
  }

  const { name, language, num_speakers: numSpeakers } = payload.voice
  if (typeof name !== 'string' || typeof language !== 'string' || typeof numSpeakers !== 'number') {
    throw new PiperError('response', 'Piper returned invalid voice information.')
  }

  return { name, language, numSpeakers }
}

export const getPiperVoices = async (): Promise<string[]> => {
  const response = await fetchWithTimeout(`${PIPER_BASE_URL}/voices`, { method: 'GET' }, CONNECTION_TIMEOUT_MS)
  if (!response.ok) throw new PiperError('http', `Piper responded with HTTP ${response.status}.`)

  let payload: unknown
  try {
    payload = await response.json()
  } catch (error) {
    throw new PiperError('response', 'Piper returned a malformed voice list.', { cause: error })
  }

  if (!isRecord(payload)) throw new PiperError('response', 'Piper returned an invalid voice list.')
  return Object.keys(payload).sort((left, right) => left.localeCompare(right))
}

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return globalThis.btoa(binary)
}

export const createAudioFilename = async (text: string, voice: string): Promise<string> => {
  const input = new TextEncoder().encode(`${voice}\n${text.trim()}`)
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', input)
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
  const voiceSlug = voice
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'voice'

  return `linguo-${voiceSlug}-${hash}.wav`
}

export const synthesizeWithPiper = async (text: string, voice: string): Promise<PiperAudio> => {
  const response = await fetchWithTimeout(
    `${PIPER_BASE_URL}/synthesize`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'audio/wav' },
      body: JSON.stringify({ text, voice }),
    },
    SYNTHESIS_TIMEOUT_MS,
  )

  if (!response.ok) {
    throw new PiperError('synthesis', `Piper could not synthesize the phrase (HTTP ${response.status}).`)
  }

  const audioBuffer = await response.arrayBuffer()
  if (audioBuffer.byteLength === 0) {
    throw new PiperError('synthesis', 'Piper returned an empty audio file.')
  }

  return {
    filename: await createAudioFilename(text, voice),
    data: arrayBufferToBase64(audioBuffer),
  }
}

export const getPiperErrorMessage = (error: unknown): string => {
  console.error('Piper error:', error)

  if (error instanceof PiperError) {
    if (error.kind === 'connection') {
      return 'Could not connect to Piper. Make sure its local server is running on port 5000.'
    }
    if (error.kind === 'response' || error.kind === 'http') {
      return 'Piper returned an invalid response. Restart its local server and try again.'
    }
    return error.message
  }

  if (error instanceof Error && error.message) return error.message
  return 'Something unexpected happened while generating pronunciation audio.'
}
