const EXAMPLE_QUERIES = [
  "I want a phone under $500 with a good camera",
  "Suggest a gaming laptop",
  "Best headphones for music",
];

export default function SearchPanel({
  query,
  onQueryChange,
  onSubmit,
  isLoading,
}) {
  return (
    <section className="hero-card">
      <div>
        <p className="eyebrow">AI-powered recommendations</p>
        <h1 className="hero-title">Find the right product from your catalog</h1>
        <p className="hero-copy">
          Tell the assistant what you want. The AI extracts structured preferences, and the backend matches products locally.
        </p>
      </div>

      <form className="search-form" onSubmit={onSubmit}>
        <label className="sr-only" htmlFor="preference-query">
          Shopping preferences
        </label>

        <textarea
          id="preference-query"
          className="search-input"
          rows="3"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Example: I want a phone under $500 with a good camera"
        />

        <div className="search-actions">
          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? "Thinking..." : "Get Recommendations"}
          </button>

          <p className="helper-text">Dataset prices are shown in INR.</p>
        </div>
      </form>

      <div className="chip-row">
        {EXAMPLE_QUERIES.map((example) => (
          <button
            key={example}
            className="chip-button"
            type="button"
            onClick={() => onQueryChange(example)}
          >
            {example}
          </button>
        ))}
      </div>
    </section>
  );
}
