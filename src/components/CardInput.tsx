interface CardInputProps {
  value: string
  isAnalyzing: boolean
  onChange: (value: string) => void
  onAnalyze: () => void
  onClear: () => void
}

export function CardInput({ value, isAnalyzing, onChange, onAnalyze, onClear }: CardInputProps) {
  return (
    <section className="workspace-panel input-panel" aria-labelledby="input-title">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Step 1</span>
          <h2 id="input-title">Paste your cards</h2>
        </div>
        <span className="input-count">{value.length.toLocaleString()} characters</span>
      </div>

      <label className="sr-only" htmlFor="card-input">ChatGPT card output</label>
      <textarea
        id="card-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={'Front: I ran into an old friend.\nBack: Me encontré con un viejo amigo.\nExample: I ran into an old friend at the supermarket.\nNotes: “Run into” means to meet unexpectedly.\nTags: phrasal-verb, conversation\n\n---\n\nFront: ...'}
        spellCheck="true"
      />

      <p className="help-text">
        Separate cards with <code>---</code>. Front and Back are required; Example, Notes, and Tags are optional.
      </p>

      <div className="button-row">
        <button className="button button--primary" type="button" onClick={onAnalyze} disabled={!value.trim() || isAnalyzing}>
          {isAnalyzing ? <><span className="spinner" aria-hidden="true" />Analyzing…</> : 'Analyze cards'}
        </button>
        <button className="button button--ghost" type="button" onClick={onClear} disabled={!value || isAnalyzing}>
          Clear
        </button>
      </div>
    </section>
  )
}

