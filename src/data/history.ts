export type HistoryEntry = {
  id: string
  year: string
  title: string
  summary: string
  sourceNote: string
}

export const historyEntries: HistoryEntry[] = [
  {
    id: 'municipal-1918',
    year: '1918',
    title: 'Stadsgemeente Madiun',
    summary:
      'Kota Praja / Stadsgemeente Madiun was established on 20 June 1918 under the Dutch colonial administration. This gives you a strong setting for a “city is becoming a city” scenario.',
    sourceNote: 'Prototype note: verify wording and primary-source details before final release.',
  },
  {
    id: 'raadhuis-1930',
    year: '1930',
    title: 'Raadhuis te Madioen opens',
    summary:
      'The building now known as Balai Kota Madiun was opened on 1 August 1930. The city government describes it as the former Raadhuis te Madioen and highlights its early-20th-century architectural character.',
    sourceNote: 'Prototype note: use municipal material and heritage references for the final scenario.',
  },
  {
    id: 'rejo-agung-1894',
    year: '1894',
    title: 'PG Rejo Agung and the industrial city',
    summary:
      'The city government dates the beginning of PG Rejo Agung to 1894 and connects it to the expansion of the sugar economy in the late 19th century. This can become an environment-heavy scenario about workers, transport, trade, and industrial change.',
    sourceNote: 'Prototype note: distinguish the wider regional sugar history from the exact boundaries of present-day Madiun.',
  },
]
