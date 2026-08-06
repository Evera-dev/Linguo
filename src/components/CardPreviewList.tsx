import type { ParsedCard } from '../features/cards/cardTypes.ts'

interface CardPreviewListProps {
  cards: ParsedCard[]
  selectedCardId: string | null
  hasAnalyzed: boolean
  onSelect: (cardId: string) => void
}

function CardDetails({ card, cardNumber }: { card: ParsedCard; cardNumber: number }) {
  return (
    <div className="card-details" aria-label={`Details for card ${cardNumber}`}>
      <dl>
        <div><dt>Front</dt><dd>{card.front || <em>Missing</em>}</dd></div>
        <div><dt>Back</dt><dd>{card.back || <em>Missing</em>}</dd></div>
        {card.example && <div><dt>Example</dt><dd>{card.example}</dd></div>}
        {card.notes && <div><dt>Notes</dt><dd>{card.notes}</dd></div>}
        <div><dt>Tags</dt><dd>{card.tags.length ? card.tags.join(', ') : <em>None</em>}</dd></div>
      </dl>

      {card.errors.length > 0 && (
        <div className="notice-list notice-list--error">
          <strong>Needs attention</strong>
          <ul>{card.errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </div>
      )}
      {card.warnings.length > 0 && (
        <div className="notice-list notice-list--warning">
          <strong>Warnings</strong>
          <ul>{card.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </div>
      )}
    </div>
  )
}

export function CardPreviewList({ cards, selectedCardId, hasAnalyzed, onSelect }: CardPreviewListProps) {
  const invalidCount = cards.filter((card) => card.errors.length > 0).length
  const selectedCard = cards.find((card) => card.id === selectedCardId) ?? cards[0]
  const selectedIndex = selectedCard ? cards.indexOf(selectedCard) : -1

  return (
    <section className="workspace-panel preview-panel" aria-labelledby="preview-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Step 2</span>
          <h2 id="preview-title">Review</h2>
        </div>
        <span className={`count-badge ${invalidCount ? 'count-badge--error' : ''}`}>
          {cards.length} {cards.length === 1 ? 'card' : 'cards'}
        </span>
      </div>

      {cards.length === 0 ? (
        <div className="empty-preview">
          <span aria-hidden="true">✦</span>
          <h3>{hasAnalyzed ? 'No cards found' : 'Your preview will appear here'}</h3>
          <p>{hasAnalyzed ? 'Check the format and try again.' : 'Paste your structured text and analyze it to begin.'}</p>
        </div>
      ) : (
        <>
          <div className="validation-summary" role="status">
            <span className={invalidCount ? 'validation-icon validation-icon--error' : 'validation-icon'} aria-hidden="true">
              {invalidCount ? '!' : '✓'}
            </span>
            <div>
              <strong>{invalidCount ? `${invalidCount} ${invalidCount === 1 ? 'card needs' : 'cards need'} attention` : 'All required fields are present'}</strong>
              <span>{invalidCount ? 'Select a card to review its errors.' : 'Review the details before importing.'}</span>
            </div>
          </div>

          <div className="card-review-layout">
            <div className="card-list" role="list" aria-label="Detected cards">
              {cards.map((card, index) => {
                const hasErrors = card.errors.length > 0
                return (
                  <button
                    type="button"
                    className={`card-list-item ${card.id === selectedCard?.id ? 'card-list-item--selected' : ''}`}
                    onClick={() => onSelect(card.id)}
                    key={card.id}
                    role="listitem"
                    aria-pressed={card.id === selectedCard?.id}
                  >
                    <span className="card-number">{index + 1}</span>
                    <span className="card-list-copy">
                      <strong>{card.front || 'Missing Front'}</strong>
                      <span>{card.back || 'Missing Back'}</span>
                    </span>
                    <span className={`mini-status ${hasErrors ? 'mini-status--error' : ''}`} aria-label={hasErrors ? 'Invalid' : 'Valid'}>
                      {hasErrors ? '!' : '✓'}
                    </span>
                  </button>
                )
              })}
            </div>
            {selectedCard && <CardDetails card={selectedCard} cardNumber={selectedIndex + 1} />}
          </div>
        </>
      )}
    </section>
  )
}

