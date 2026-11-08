import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import { Alert02Icon, InboxIcon, ReloadIcon, Search01Icon, SparklesIcon } from '@hugeicons/core-free-icons'
import { ApiError, fetchPredictions } from '../lib/api'
import type { Prediction } from '../types'
import { PredictionCard } from '../components/PredictionCard'
import { marketHasData, predictionConfidence, resolvePrimaryPredictionsByMatch, type MarketId } from '../lib/markets'
import { formatLeagueName } from '../lib/format'

/**
 * One page per market (Money Line / Over-Under / BTTS / Team Totals),
 * each its own nav destination under Football instead of a single
 * "Predictions" tab with a model_version dropdown. The market is fixed
 * by which nav item got clicked -- there is no picker on this page at
 * all; MarketTabs on each card still lets you flip to a different
 * market for that one match without leaving the page.
 *
 * Every prediction row for a match is fetched (not filtered by
 * model_version) and collapsed to one card per match via
 * resolvePrimaryPredictionsByMatch (PROJECT.md 6m) -- a match can carry
 * both a goals_engine_v1 row and a blend_v1 row, and this page only
 * ever wants the single best-available one.
 *
 * `isForecast` picks which universe of matches this instantiation shows
 * (PROJECT.md 6o): the four left-nav market tabs pass `true` -- real,
 * not-yet-played fixtures, the actual product (the model is trained on
 * all history up to now specifically so it can predict what's next).
 * The separate right-side "Lab" destination passes `false` -- the
 * walk-forward-VALIDATED predictions on already-decided matches, kept
 * as its own distinct context instead of mixed into the live product.
 */
export function MarketPage({
  market,
  title,
  description,
  icon,
  isForecast,
  onOpenMatch,
  headerSlot,
  forecastScope = 'upcoming',
}: {
  market: MarketId
  title: string
  description: string
  icon: IconSvgElement
  isForecast: boolean
  onOpenMatch: (matchId: number) => void
  /** Extra content rendered between the title row and the filter
   * toolbar -- e.g. LabPage's LivePerformanceHeader. Optional; most
   * instantiations (the four market tabs) don't pass one. */
  headerSlot?: ReactNode
  /** Which half of the forecast population this instantiation shows.
   * Only meaningful when isForecast=true (backtest rows are always
   * already-decided, nothing to split either way). 'upcoming' (default)
   * is the four "what's next" nav tabs -- once a fixture is decided it's
   * no longer "what's next," so it drops off. 'decided' is the Lab's
   * "Live Forecasts" tab (PROJECT.md 6-af/6-ag): a real forecast made
   * ahead of time, now graded against its real result -- that's ALL it
   * shows, on purpose. A forecast belongs in exactly one of the two
   * views at any moment, never both, so a still-upcoming match never
   * shows up in Live Forecasts and a decided one never lingers on the
   * money-line/O-U/BTTS tabs -- each fixture moves from one to the other
   * the instant its real score lands, not before and not still-also. */
  forecastScope?: 'upcoming' | 'decided'
}) {
  const [predictions, setPredictions] = useState<Prediction[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Filter fields, not navigation -- narrow what's already loaded rather
  // than trigger a new fetch, same pattern as TeamsPage.
  const [leagueFilter, setLeagueFilter] = useState<string>('all')
  const [seasonFilter, setSeasonFilter] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<'date' | 'confidence_desc' | 'confidence_asc'>('date')

  const load = () => {
    setLoading(true)
    setError(null)
    fetchPredictions({ isForecast, limit: 1000 })
      .then((all) => {
        const resolved = resolvePrimaryPredictionsByMatch(all)
        // A forecast lives in exactly one of the two forecast views at
        // any moment, split purely on whether a real score exists yet --
        // NOT on whether kickoff has passed. Real bug found live
        // (PROJECT.md changelog): this used to filter 'upcoming' by
        // kickoff time, which silently drops a match the instant it
        // starts even though sync_scores.py can take hours (or, without
        // a reliable schedule, much longer) to actually fill in the real
        // score -- the match vanished from its market tab AND wasn't
        // decided yet for the Lab, invisible everywhere in between. A
        // match now stays on its normal market tab for as long as it
        // has no real score, live or not, and only moves to the Lab's
        // Live Forecasts tab the moment it actually has one. Backtest
        // rows (isForecast=false) are always already-decided, so this
        // split never applies to them.
        const scoped = !isForecast
          ? resolved
          : forecastScope === 'upcoming'
            ? resolved.filter((p) => p.home_score === null || p.away_score === null)
            : resolved.filter((p) => p.home_score !== null && p.away_score !== null)
        setPredictions(scoped.filter((p) => marketHasData(p, market)))
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, isForecast, forecastScope])

  // Grouped by league, alphabetically, so the page reads like separate
  // league sections instead of one long undifferentiated grid. Within a
  // league, sortMode picks the order: by default, soonest kickoff first
  // for forecasts (upcoming), most recent match first for the Lab
  // (already-decided, so newest is the freshest read on how the model's
  // doing) -- or, if the user picked a confidence sort, by the model's
  // own money-line confidence instead, so the highest (or lowest)
  // conviction picks surface first regardless of kickoff time.
  const leagueGroups = useMemo(() => {
    if (!predictions) return []
    const groups = new Map<string, Prediction[]>()
    for (const p of predictions) {
      const key = p.league ?? ''
      const list = groups.get(key)
      if (list) list.push(p)
      else groups.set(key, [p])
    }
    const sortFn: (a: Prediction, b: Prediction) => number =
      sortMode === 'confidence_desc'
        ? (a, b) => predictionConfidence(b) - predictionConfidence(a)
        : sortMode === 'confidence_asc'
          ? (a, b) => predictionConfidence(a) - predictionConfidence(b)
          : (a, b) => {
              if (!a.match_date || !b.match_date) return 0
              const diff = new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
              // Soonest-first only for the pure "what's next" view.
              // Everything else (backtest, and Live Forecasts' decided-
              // only list) is looking backward, not forward -- the game
              // that just finished and just got a real result belongs at
              // the top, same direction backtest browsing already uses.
              return isForecast && forecastScope === 'upcoming' ? diff : -diff
            }
    return Array.from(groups.entries())
      .sort(([a], [b]) => formatLeagueName(a).localeCompare(formatLeagueName(b)))
      .map(([league, preds]) => ({
        league,
        predictions: [...preds].sort(sortFn),
      }))
  }, [predictions, isForecast, forecastScope, sortMode])

  // Only meaningful for the Lab (backtest rows span many real seasons);
  // forecasts are all upcoming, effectively one season, so this stays
  // empty and the season dropdown doesn't render for the four market tabs.
  const availableSeasons = useMemo(() => {
    if (isForecast || !predictions) return []
    const seasons = new Set<number>()
    for (const p of predictions) {
      if (p.season !== null) seasons.add(p.season)
    }
    return Array.from(seasons).sort((a, b) => b - a)
  }, [predictions, isForecast])

  // Applies all three filter fields, same pattern as TeamsPage: narrows to
  // the selected season (Lab only) and league (if any), then to matches
  // where either team's name matches the search text -- a league with no
  // matches left is dropped entirely rather than shown empty.
  const visibleLeagueGroups = useMemo(() => {
    const query = search.trim().toLowerCase()
    const groups = leagueFilter === 'all' ? leagueGroups : leagueGroups.filter((g) => g.league === leagueFilter)
    return groups
      .map((g) => ({
        league: g.league,
        predictions: g.predictions.filter((p) => {
          if (seasonFilter !== 'all' && String(p.season) !== seasonFilter) return false
          if (!query) return true
          return (p.home_team ?? '').toLowerCase().includes(query) || (p.away_team ?? '').toLowerCase().includes(query)
        }),
      }))
      .filter((g) => g.predictions.length > 0)
  }, [leagueGroups, leagueFilter, seasonFilter, search])

  // Confidence sort answers "show me the highest/lowest-conviction pick
  // right now" -- a per-league section would bury the single best pick
  // behind four others just because they're alphabetically first, so
  // this flattens across leagues into one globally-ordered list instead
  // of grouped sections. Reuses visibleLeagueGroups so the league/season/
  // search filters still apply. Live Forecasts (forecastScope='decided')
  // gets the same flattening even under the default date sort -- "the
  // game that just ended, across every league" is exactly as buried by
  // per-league grouping as the top confidence pick would be, and the
  // whole point of this view is seeing the latest result first.
  const isLiveForecastsView = isForecast && forecastScope === 'decided'
  const flatSortedPredictions = useMemo(() => {
    if (sortMode === 'date' && !isLiveForecastsView) return null
    const all = visibleLeagueGroups.flatMap((g) => g.predictions)
    if (sortMode === 'confidence_desc') return [...all].sort((a, b) => predictionConfidence(b) - predictionConfidence(a))
    if (sortMode === 'confidence_asc') return [...all].sort((a, b) => predictionConfidence(a) - predictionConfidence(b))
    return [...all].sort((a, b) => {
      if (!a.match_date || !b.match_date) return 0
      return new Date(b.match_date).getTime() - new Date(a.match_date).getTime()
    })
  }, [visibleLeagueGroups, sortMode, isLiveForecastsView])

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent-400/25 to-accent-600/10 text-accent-300 shadow-[0_0_16px_-4px_var(--color-accent-500)]">
              <HugeiconsIcon icon={icon} size={15} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-[14px] font-semibold tracking-tight text-zinc-50">{title}</h1>
              <p className="mt-0.5 max-w-2xl text-[11px] leading-relaxed text-zinc-400">{description}</p>
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

        {headerSlot}

        {predictions && predictions.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {availableSeasons.length > 0 && (
              <select
                value={seasonFilter}
                onChange={(e) => setSeasonFilter(e.target.value)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 outline-none transition-colors hover:bg-white/[0.06] focus:border-white/20"
              >
                <option value="all">All seasons</option>
                {availableSeasons.map((s) => (
                  <option key={s} value={s}>
                    {String(s).slice(0, 2)}/{String(s).slice(2)}
                  </option>
                ))}
              </select>
            )}
            <select
              value={leagueFilter}
              onChange={(e) => setLeagueFilter(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 outline-none transition-colors hover:bg-white/[0.06] focus:border-white/20"
            >
              <option value="all">All leagues</option>
              {leagueGroups.map((g) => (
                <option key={g.league || 'unknown'} value={g.league}>
                  {formatLeagueName(g.league)}
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
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as typeof sortMode)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 outline-none transition-colors hover:bg-white/[0.06] focus:border-white/20"
            >
              <option value="date">Sort: {isForecast && forecastScope === 'upcoming' ? 'Kickoff time' : 'Most recent'}</option>
              <option value="confidence_desc">Sort: Confidence (high → low)</option>
              <option value="confidence_asc">Sort: Confidence (low → high)</option>
            </select>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3.5 text-[11px] text-red-300">
            <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.5} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !predictions && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-56" />
            ))}
          </div>
        )}

        {!loading && !error && predictions && predictions.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 py-16 text-center">
            <HugeiconsIcon icon={isForecast ? SparklesIcon : InboxIcon} size={28} strokeWidth={1.5} className="text-zinc-600" />
            <div className="text-[11px] font-medium text-zinc-300">
              No {isForecast
                ? `${forecastScope === 'upcoming' ? 'upcoming ' : 'decided, graded '}${title.toLowerCase()} forecasts`
                : `${title.toLowerCase()} predictions`} yet
            </div>
            <p className="max-w-sm text-[10px] leading-relaxed text-zinc-500">
              {isForecast ? (
                forecastScope === 'upcoming' ? (
                  <>
                    Run <code className="rounded bg-white/5 px-1 py-0.5">generate_forecasts.py</code> to predict
                    real upcoming fixtures -- they'll show up here automatically.
                  </>
                ) : (
                  <>
                    Once a forecast's match is actually played,{' '}
                    <code className="rounded bg-white/5 px-1 py-0.5">sync_scores.py</code> fills in the real score
                    and it moves here automatically -- nothing to run by hand.
                  </>
                )
              ) : (
                <>
                  The <code className="rounded bg-white/5 px-1 py-0.5">predictions</code> table has no
                  backtest rows with this market yet. Run{' '}
                  <code className="rounded bg-white/5 px-1 py-0.5">generate_predictions.py</code> and
                  they'll show up here automatically.
                </>
              )}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          predictions &&
          predictions.length > 0 &&
          visibleLeagueGroups.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/10 py-16 text-center">
              <HugeiconsIcon icon={Search01Icon} size={28} strokeWidth={1.5} className="text-zinc-600" />
              <div className="text-[11px] font-medium text-zinc-300">No teams match "{search}"</div>
            </div>
          )}

        {/* Confidence sort: one flat, globally-ordered grid across every
         * league -- grouping by league would bury the actual highest (or
         * lowest) confidence card behind whichever league sorts first
         * alphabetically. */}
        {flatSortedPredictions && flatSortedPredictions.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {flatSortedPredictions.map((p, i) => (
              <PredictionCard key={p.id} prediction={p} index={i} onOpen={onOpenMatch} defaultMarket={market} />
            ))}
          </div>
        )}

        {!flatSortedPredictions && visibleLeagueGroups.length > 0 && (
          <div className="flex flex-col gap-8">
            {visibleLeagueGroups.map(({ league, predictions: leaguePredictions }) => (
              <div key={league || 'unknown'} className="flex flex-col gap-4">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-[13px] font-semibold tracking-tight text-zinc-200">
                    {formatLeagueName(league)}
                  </h2>
                  <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">
                    {leaguePredictions.length}
                  </span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {leaguePredictions.map((p, i) => (
                    <PredictionCard key={p.id} prediction={p} index={i} onOpen={onOpenMatch} defaultMarket={market} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
