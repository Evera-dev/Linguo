import type { ImportResult } from '../features/anki/ankiTypes.ts'

interface ImportSummaryProps {
  result: ImportResult | null
  error: string | null
  onDismiss: () => void
}

export function ImportSummary({ result, error, onDismiss }: ImportSummaryProps) {
  if (!result && !error) return null

  const isSuccess = result?.failed === 0
  const title = error
    ? 'Import could not be completed'
    : isSuccess
      ? 'Cards sent to Anki'
      : 'Import completed with some issues'

  return (
    <section className={`import-summary ${error || !isSuccess ? 'import-summary--warning' : ''}`} aria-live="polite">
      <span className="summary-icon" aria-hidden="true">{error || !isSuccess ? '!' : '✓'}</span>
      <div className="summary-content">
        <h2>{title}</h2>
        {error && <p>{error}</p>}
        {result && (
          <>
            <p>
              <strong>{result.added}</strong> added · <strong>{result.failed}</strong> failed
              {result.duplicates > 0 && <> · <strong>{result.duplicates}</strong> duplicate{result.duplicates === 1 ? '' : 's'}</>}
            </p>
            {result.failures.length > 0 && (
              <ul>
                {result.failures.map((failure) => (
                  <li key={failure.cardId}>
                    <strong>Card {failure.cardNumber}:</strong> {failure.reason}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
      <button type="button" className="dismiss-button" onClick={onDismiss} aria-label="Dismiss import result">×</button>
    </section>
  )
}
