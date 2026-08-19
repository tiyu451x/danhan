import { historyEntries } from '../data/history'

export function HistoryPage() {
  return (
    <main className="history-page">
      <section className="history-hero">
        <div>
          <p className="eyebrow">MATERIAL MODE</p>
          <h1>Learn the history without playing the game.</h1>
          <p>This area is separate from the game loop. Later it can become a searchable archive with timelines, maps, images, sources, and glossary entries.</p>
        </div>
        <div className="history-hero-card">
          <div className="image-placeholder">HISTORY IMAGE / MAP PNG</div>
          <small>Replace this placeholder with a heritage photo, map, document scan, or illustration.</small>
        </div>
      </section>
      <section className="history-grid">
        {historyEntries.map((entry) => (
          <article className="history-card" key={entry.id}>
            <span className="year-pill">{entry.year}</span>
            <h2>{entry.title}</h2>
            <p>{entry.summary}</p>
            <small>{entry.sourceNote}</small>
          </article>
        ))}
      </section>
    </main>
  )
}
