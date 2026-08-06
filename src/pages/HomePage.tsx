import { useMemo, useState } from 'react'
import { AppHeader } from '../components/AppHeader.tsx'
import { CardInput } from '../components/CardInput.tsx'
import { CardPreviewList } from '../components/CardPreviewList.tsx'
import { DeckSelector } from '../components/DeckSelector.tsx'
import { ImportSummary } from '../components/ImportSummary.tsx'
import { getAnkiErrorMessage, importCards } from '../features/anki/ankiClient.ts'
import type { ImportResult } from '../features/anki/ankiTypes.ts'
import { parseCards } from '../features/cards/cardParser.ts'
import type { ParsedCard } from '../features/cards/cardTypes.ts'
import { useAnkiConnection } from '../hooks/useAnkiConnection.ts'

const STORAGE_KEYS = {
  input: 'linguo.lastInput',
  deck: 'linguo.lastDeck',
  keepText: 'linguo.keepTextAfterImport',
} as const

const readStoredValue = (key: string, fallback = ''): string => {
  try {
    return window.localStorage.getItem(key) ?? fallback
  } catch {
    return fallback
  }
}

const storeValue = (key: string, value: string): void => {
  try {
    window.localStorage.setItem(key, value)
  } catch (error) {
    console.warn('Could not save a Linguo preference.', error)
  }
}

const waitForPaint = (): Promise<void> =>
  new Promise((resolve) => window.requestAnimationFrame(() => resolve()))

export function HomePage() {
  const [isDarkMode, setIsDarkMode] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  )
  const [input, setInput] = useState(() => readStoredValue(STORAGE_KEYS.input))
  const [cards, setCards] = useState<ParsedCard[]>([])
  const [hasAnalyzed, setHasAnalyzed] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [deckPreference, setDeckPreference] = useState(() => readStoredValue(STORAGE_KEYS.deck))
  const [keepTextAfterImport, setKeepTextAfterImport] = useState(
    () => readStoredValue(STORAGE_KEYS.keepText, 'true') !== 'false',
  )
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const { status, decks, message: connectionMessage, isRefreshing, refresh } = useAnkiConnection()

  const selectedDeck = decks.includes(deckPreference) ? deckPreference : decks[0] ?? ''
  const invalidCardCount = useMemo(
    () => cards.filter((card) => card.errors.length > 0).length,
    [cards],
  )

  const canImport =
    status === 'connected' &&
    Boolean(selectedDeck) &&
    cards.length > 0 &&
    invalidCardCount === 0 &&
    !isImporting

  const headerMessage = (() => {
    if (importResult?.failed === 0) return 'Your cards were sent to Anki.'
    if (importResult && importResult.failed > 0) return 'Some cards need your attention.'
    if (isAnalyzing) return 'I’m reading your cards…'
    if (cards.length > 0 && invalidCardCount > 0) return 'Some cards need your attention.'
    if (cards.length > 0) return 'Everything looks good. Ready to import?'
    if (hasAnalyzed) return 'I could not find any cards yet.'
    return 'Paste your ChatGPT output.'
  })()

  const resetImportFeedback = () => {
    setImportResult(null)
    setImportError(null)
  }

  const handleInputChange = (value: string) => {
    setInput(value)
    storeValue(STORAGE_KEYS.input, value)
    setCards([])
    setSelectedCardId(null)
    setHasAnalyzed(false)
    resetImportFeedback()
  }

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    resetImportFeedback()
    await waitForPaint()

    const parsedCards = parseCards(input)
    setCards(parsedCards)
    setSelectedCardId(parsedCards[0]?.id ?? null)
    setHasAnalyzed(true)
    setIsAnalyzing(false)
  }

  const handleClear = () => {
    setInput('')
    storeValue(STORAGE_KEYS.input, '')
    setCards([])
    setSelectedCardId(null)
    setHasAnalyzed(false)
    resetImportFeedback()
  }

  const handleDeckChange = (deck: string) => {
    setDeckPreference(deck)
    storeValue(STORAGE_KEYS.deck, deck)
    resetImportFeedback()
  }

  const handleKeepTextChange = (keep: boolean) => {
    setKeepTextAfterImport(keep)
    storeValue(STORAGE_KEYS.keepText, String(keep))
  }

  const handleImport = async () => {
    if (!canImport) return
    setIsImporting(true)
    resetImportFeedback()

    try {
      const result = await importCards(cards, selectedDeck)
      setImportResult(result)
      if (result.failed === 0 && !keepTextAfterImport) {
        setInput('')
        storeValue(STORAGE_KEYS.input, '')
        setCards([])
        setSelectedCardId(null)
        setHasAnalyzed(false)
      }
    } catch (error) {
      setImportError(getAnkiErrorMessage(error))
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className={`app-shell ${isDarkMode ? 'app-shell--dark' : ''}`}>
      <AppHeader
        message={headerMessage}
        connectionStatus={status}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((current) => !current)}
      />

      <main id="main-content">
        <section className="intro" aria-labelledby="page-title">
          <span className="intro-kicker">ChatGPT → Anki, without the busywork</span>
          <h1 id="page-title">Turn language practice into<br /><span>cards you’ll remember.</span></h1>
          <p>Paste structured cards, review them, and send them straight to your local Anki collection.</p>
        </section>

        <ImportSummary result={importResult} error={importError} onDismiss={resetImportFeedback} />

        <div className="workspace-grid">
          <CardInput
            value={input}
            isAnalyzing={isAnalyzing}
            onChange={handleInputChange}
            onAnalyze={() => void handleAnalyze()}
            onClear={handleClear}
          />
          <CardPreviewList
            cards={cards}
            selectedCardId={selectedCardId}
            hasAnalyzed={hasAnalyzed}
            onSelect={setSelectedCardId}
          />
        </div>

        <DeckSelector
          decks={decks}
          selectedDeck={selectedDeck}
          connectionStatus={status}
          connectionMessage={connectionMessage}
          isRefreshing={isRefreshing}
          isImporting={isImporting}
          cardCount={cards.length}
          canImport={canImport}
          keepTextAfterImport={keepTextAfterImport}
          onDeckChange={handleDeckChange}
          onRefresh={() => void refresh()}
          onImport={() => void handleImport()}
          onKeepTextChange={handleKeepTextChange}
        />
      </main>

      <footer>
        <span>Linguo</span>
        <p>Local-first. Your cards stay between this browser and Anki.</p>
      </footer>
    </div>
  )
}
