import type { PiperConnectionStatus } from '../features/audio/piperTypes.ts'
import type { ImportProgress } from '../features/anki/ankiTypes.ts'
import type { ConnectionStatus } from '../hooks/useAnkiConnection.ts'
import { AudioSettings } from './AudioSettings.tsx'

interface DeckSelectorProps {
  decks: string[]
  selectedDeck: string
  connectionStatus: ConnectionStatus
  connectionMessage: string | null
  isRefreshing: boolean
  isImporting: boolean
  cardCount: number
  canImport: boolean
  keepTextAfterImport: boolean
  includeAudio: boolean
  piperStatus: PiperConnectionStatus
  piperMessage: string | null
  piperVoices: string[]
  selectedVoice: string
  isPiperRefreshing: boolean
  importProgress: ImportProgress | null
  onDeckChange: (deck: string) => void
  onRefresh: () => void
  onImport: () => void
  onKeepTextChange: (keep: boolean) => void
  onIncludeAudioChange: (include: boolean) => void
  onVoiceChange: (voice: string) => void
  onPiperRefresh: () => void
}

export function DeckSelector({
  decks,
  selectedDeck,
  connectionStatus,
  connectionMessage,
  isRefreshing,
  isImporting,
  cardCount,
  canImport,
  keepTextAfterImport,
  includeAudio,
  piperStatus,
  piperMessage,
  piperVoices,
  selectedVoice,
  isPiperRefreshing,
  importProgress,
  onDeckChange,
  onRefresh,
  onImport,
  onKeepTextChange,
  onIncludeAudioChange,
  onVoiceChange,
  onPiperRefresh,
}: DeckSelectorProps) {
  const importLabel = (() => {
    if (!isImporting || !importProgress) {
      return `Import ${cardCount} ${cardCount === 1 ? 'card' : 'cards'}`
    }
    if (importProgress.phase === 'validating') return 'Checking cards…'
    if (importProgress.phase === 'sending') return 'Sending to Anki…'
    return `Generating audio ${importProgress.current}/${importProgress.total}`
  })()

  return (
    <section className="import-panel" aria-labelledby="import-title">
      <div className="import-heading">
        <div>
          <span className="eyebrow">Step 3</span>
          <h2 id="import-title">Send to Anki</h2>
          <p>Choose the deck where Linguo should add these cards.</p>
        </div>
        <div className={`connection-pill connection-pill--${connectionStatus}`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {connectionStatus === 'connected' ? 'Connected' : connectionStatus === 'checking' ? 'Connecting…' : 'Not connected'}
        </div>
      </div>

      {connectionMessage && <p className="connection-message" role="alert">{connectionMessage}</p>}

      <AudioSettings
        includeAudio={includeAudio}
        status={piperStatus}
        message={piperMessage}
        voices={piperVoices}
        selectedVoice={selectedVoice}
        isRefreshing={isPiperRefreshing}
        isImporting={isImporting}
        onIncludeAudioChange={onIncludeAudioChange}
        onVoiceChange={onVoiceChange}
        onRefresh={onPiperRefresh}
      />

      <div className="import-controls">
        <div className="deck-field">
          <label htmlFor="deck-select">Anki deck</label>
          <div className="select-row">
            <select
              id="deck-select"
              value={selectedDeck}
              onChange={(event) => onDeckChange(event.target.value)}
              disabled={connectionStatus !== 'connected' || isRefreshing || decks.length === 0}
            >
              <option value="">{connectionStatus === 'connected' ? 'Select a deck' : 'Connect to Anki first'}</option>
              {decks.map((deck) => <option value={deck} key={deck}>{deck}</option>)}
            </select>
            <button className="button button--secondary refresh-button" type="button" onClick={onRefresh} disabled={isRefreshing || isImporting}>
              {isRefreshing ? <span className="spinner spinner--dark" aria-hidden="true" /> : <span aria-hidden="true">↻</span>}
              <span>{connectionStatus === 'disconnected' ? 'Retry' : 'Reload decks'}</span>
            </button>
          </div>
        </div>

        <button className="button button--import" type="button" onClick={onImport} disabled={!canImport}>
          {isImporting && <span className="spinner" aria-hidden="true" />}
          {importLabel}
          {!isImporting && <span aria-hidden="true">→</span>}
        </button>
      </div>

      <label className="preference-check">
        <input
          type="checkbox"
          checked={keepTextAfterImport}
          onChange={(event) => onKeepTextChange(event.target.checked)}
        />
        Keep pasted text after a successful import
      </label>
    </section>
  )
}
