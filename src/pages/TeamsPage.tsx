import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert02Icon, ReloadIcon, Search01Icon, Table01Icon } from '@hugeicons/core-free-icons'
import { ApiError, fetchStandings } from '../lib/api'
import type { Standing } from '../types'
import { formatLeagueName } from '../lib/format'

// Same 5-league scope as everywhere else in this project (generate_forecasts.py,
// load_standings_to_postgres.py) -- real ESPN standings, not a model
// prediction (PROJECT.md section 6p).
const LEAGUES = ['ENG-Premier League', 'ESP-La Liga', 'ITA-Serie A', 'GER-Bundesliga', 'FRA-Ligue 1']

const STAT_COLUMNS: { key: keyof Standing; label: string }[] = [
  { key: 'games_played', label: 'P' },
  { key: 'wins', label: 'W' },
  { key: 'draws', label: 'D' },
  { key: 'losses', label: 'L' },
  { key: 'goals_for', label: 'GF' },
  { key: 'goals_against', label: 'GA' },
  { key: 'goal_difference', label: 'GD' },
]

// ESPN's own zone_description text, matched loosely -- not an exhaustive
// enum (varies by league: "Champions League", "Champions League Qualifying",
// "Relegation", "Relegation Playoff", etc.), so this keys off substrings
// rather than exact values.
function zoneAccentClass(zone: string | null): string {
  if (!zone) return ''
  const z = zone.toLowerCase()
  if (z.includes('champions league')) return 'border-l-2 border-accent-500'
  if (z.includes('europa') || z.includes('conference')) return 'border-l-2 border-sky-400'
  if (z.includes('relegation')) return 'border-l-2 border-red-400'
  return ''
}

function TeamLogo({ standing }: { standing: Standing }) {
  const [errored, setErrored] = useState(false)
  if (!standing.logo_url || errored) {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[8px] font-semibold text-zinc-500">
        {standing.name.slice(0, 1)}
      </div>
    )
  }
  return (
    <img
      src={standing.logo_url}
      alt=""
      className="h-5 w-5 shrink-0 object-contain"
      onError={() => setErrored(true)}
    />
  )
}

function LeagueTable({ league, standings }: { league: string; standings: Standing[] }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="text-[13px] font-semibold tracking-tight text-zinc-200">{formatLeagueName(league)}</h2>
        <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
          {standings.length}
        </span>
        <div className="h-px flex-1 bg-white/[0.06]" />
      </div>
      <div className="surface overflow-x-auto p-0">
        <table className="w-full min-w-[560px] border-collapse text-[11px]">
          <thead>
            <tr className="border-b border-white/[0.06] text-zinc-500">
              <th className="w-8 px-3 py-2 text-left font-medium">#</th>
              <th className="px-2 py-2 text-left font-medium">Team</th>
              {STAT_COLUMNS.map((col) => (
                <th key={col.key} className="w-10 px-2 py-2 text-right font-medium">
                  {col.label}
                </th>
              ))}
              <th className="w-12 px-3 py-2 text-right font-medium">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => (
              <tr key={s.team_id} className={`border-b border-white/[0.03] last:border-0 ${zoneAccentClass(s.zone_description)}`}>
                <td className="px-3 py-2 text-zinc-500">{s.rank ?? '—'}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <TeamLogo standing={s} />
                    <span className="font-medium text-zinc-200">{s.name}</span>
                  </div>
                </td>
                {STAT_COLUMNS.map((col) => (
                  <td key={col.key} className="px-2 py-2 text-right text-zinc-400">
                    {(s[col.key] as number | null) ?? '—'}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-mono text-[11px] font-semibold text-zinc-100">
                  {s.points ?? '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function TeamsPage() {
  const [byLeague, setByLeague] = useState<Record<string, Standing[]> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Filter fields, not navigation -- narrow what's already loaded rather
  // than trigger a new fetch, so picking a league or typing a team name
  // is instant instead of a round trip.
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    setError(null)
    Promise.all(LEAGUES.map((league) => fetchStandings(league)))
      .then((results) => {
        const grouped: Record<string, Standing[]> = {}
        LEAGUES.forEach((league, i) => {
          grouped[league] = results[i]
        })
        setByLeague(grouped)
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const leaguesWithData = useMemo(() => {
    if (!byLeague) return []
    return LEAGUES.filter((league) => byLeague[league] && byLeague[league].length > 0)
  }, [byLeague])

  // Applies both filter fields: narrows to the selected league (if any),
  // then to teams whose name matches the search text -- a league with no
  // matching teams after search is dropped entirely rather than shown empty.
  const visibleByLeague = useMemo(() => {
    if (!byLeague) return []
    const query = search.trim().toLowerCase()
    const leagues = leagueFilter === 'all' ? leaguesWithData : leaguesWithData.filter((l) => l === leagueFilter)
    return leagues
      .map((league) => ({
        league,
        standings: query
          ? byLeague[league].filter((s) => s.name.toLowerCase().includes(query))
          : byLeague[league],
      }))
      .filter((entry) => entry.standings.length > 0)
  }, [byLeague, leaguesWithData, leagueFilter, search])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-8 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400/25 to-accent-600/10 text-accent-300 shadow-[0_0_16px_-4px_var(--color-accent-500)]">
              <HugeiconsIcon icon={Table01Icon} size={15} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-[14px] font-semibold tracking-tight text-zinc-50">Teams</h1>
              <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-zinc-400">
                Real league standings from ESPN -- not a model prediction. Green marks Champions League
                positions, blue Europa/Conference, red relegation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={load}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:bg-white/[0.06]"
          >
            <HugeiconsIcon icon={ReloadIcon} size={13} strokeWidth={1.5} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {byLeague && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 outline-none transition-colors hover:bg-white/[0.06] focus:border-white/20"
            >
              <option value="all">All leagues</option>
              {leaguesWithData.map((league) => (
                <option key={league} value={league}>
                  {formatLeagueName(league)}
                </option>
              ))}
            </select>
            <div className="relative">
              <HugeiconsIcon
                icon={Search01Icon}
                size={13}
                strokeWidth={1.5}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team..."
                className="rounded-lg border border-white/10 bg-white/[0.03] py-1.5 pl-8 pr-2.5 text-[11px] text-zinc-300 outline-none transition-colors placeholder:text-zinc-600 hover:bg-white/[0.06] focus:border-white/20"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3.5 text-[11px] text-red-300">
            <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.5} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !byLeague && (
          <div className="flex flex-col gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-72" />
            ))}
          </div>
        )}

        {!loading && !error && leaguesWithData.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 py-16 text-center">
            <HugeiconsIcon icon={Table01Icon} size={28} strokeWidth={1.5} className="text-zinc-600" />
            <div className="text-[11px] font-medium text-zinc-300">No standings yet</div>
            <p className="max-w-sm text-[10px] leading-relaxed text-zinc-500">
              Run <code className="rounded bg-white/5 px-1 py-0.5">load_standings_to_postgres.py</code> and
              they'll show up here automatically.
            </p>
          </div>
        )}

        {!loading && !error && leaguesWithData.length > 0 && visibleByLeague.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 py-16 text-center">
            <HugeiconsIcon icon={Search01Icon} size={28} strokeWidth={1.5} className="text-zinc-600" />
            <div className="text-[11px] font-medium text-zinc-300">No teams match "{search}"</div>
          </div>
        )}

        {visibleByLeague.length > 0 && (
          <div className="flex flex-col gap-8">
            {visibleByLeague.map(({ league, standings }) => (
              <LeagueTable key={league} league={league} standings={standings} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
