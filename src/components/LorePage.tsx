import '../styles/LorePage.css'

interface LorePageProps {
  onBack: () => void
}

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent nec magna at ' +
  'sapien tincidunt cursus. Integer euismod, velit sed cursus fermentum, arcu ' +
  'lorem malesuada dui, vitae congue leo justo ac massa.'

const ENTRIES = [
  { year: '1568', title: 'Babad Tanah Madiun', body: LOREM },
  { year: '1918', title: 'Kotapraja Madiun', body: LOREM },
  { year: '1948', title: 'Peristiwa Madiun', body: LOREM },
]

function LorePage({ onBack }: LorePageProps) {
  return (
    <div className="lore">
      <div className="lore__inner">
        <button className="lore__back" onClick={onBack}>
          ← Back to game
        </button>

        <p className="lore__kicker">Archives</p>
        <h1 className="lore__title">The material, without the game</h1>
        <p className="lore__intro">
          This page holds the real history behind Fragmen — for anyone who wants to read
          about Kota Madiun without playing. Every card in the game corresponds to an entry
          here.
        </p>

        <div className="lore__entries">
          {ENTRIES.map((entry) => (
            <article className="lore__entry" key={entry.year}>
              <span className="lore__entry-year">{entry.year}</span>
              <div>
                <h2 className="lore__entry-title">{entry.title}</h2>
                <p className="lore__entry-body">{entry.body}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}

export default LorePage
