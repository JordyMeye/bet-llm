export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${(value * 100).toFixed(1)}%`
}

export function formatOdds(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toFixed(2)
}

export function impliedProb(odds: number | null | undefined): number | null {
  if (!odds || odds <= 0) return null
  return 1 / odds
}

export function formatSigned(value: number | null | undefined, digits = 3): string {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}`
}

export function formatSignedPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${(value * 100).toFixed(1)}%`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

// League values come straight from soccerdata's own naming convention
// ("ENG-Premier League", "FRA-Ligue 1", ...) -- strip the country-code
// prefix for display, keep the raw string as the grouping key.
export function formatLeagueName(league: string | null | undefined): string {
  if (!league) return 'Unknown league'
  const dash = league.indexOf('-')
  return dash === -1 ? league : league.slice(dash + 1)
}

export function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.round(diffMs / 60000)
  if (diffMin < 1) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.round(diffHr / 24)
  return `${diffDay}d ago`
}
