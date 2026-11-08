import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert02Icon, ArrowLeftIcon } from '@hugeicons/core-free-icons'
import { ApiError, fetchMatch, fetchMatchPredictions } from '../lib/api'
import type { MatchDetail, Prediction } from '../types'
import { formatDate } from '../lib/format'
import { MultiMarketPanel } from '../components/MultiMarketPanel'
import { MatchContextPanel } from '../components/MatchContextPanel'
import { PredictionRationale } from '../components/PredictionRationale'
import { ModelComparisonPanel } from '../components/ModelComparisonPanel'
import { MODEL_VERSION_PREFERENCE } from '../lib/markets'

export function MatchDetailView({ matchId, onBack }: { matchId: number; onBack: () => void }) {
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [predictions, setPredictions] = useState<Prediction[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    Promise.all([fetchMatch(matchId), fetchMatchPredictions(matchId)])
      .then(([matchData, predictionData]) => {
        if (cancelled) return
        setMatch(matchData)
        setPredictions(predictionData)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Something went wrong.')
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [matchId])

  const primaryPrediction =
    MODEL_VERSION_PREFERENCE.map((v) => predictions?.find((p) => p.model_version === v)).find(Boolean) ??
    predictions?.[0] ??
    null

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-8 py-8">
        <button
          type="button"
          onClick={onBack}
          className="group flex w-fit items-center gap-1.5 text-[11px] font-medium text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <HugeiconsIcon
            icon={ArrowLeftIcon}
            size={13}
            strokeWidth={1.5}
            className="transition-transform group-hover:-translate-x-0.5"
          />
          Back to predictions
        </button>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3.5 text-[11px] text-red-300">
            <HugeiconsIcon icon={Alert02Icon} size={16} strokeWidth={1.5} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && !match && (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="skeleton h-96" />
            <div className="skeleton h-96" />
          </div>
        )}

        {match && (
          <>
            <div>
              <h1 className="text-[14px] font-semibold tracking-tight text-zinc-50">
                {match.home_team} <span className="text-zinc-600">vs</span> {match.away_team}
              </h1>
              <p className="mt-1 text-[11px] text-zinc-500">
                {match.league} &middot; {formatDate(match.match_date)}
                {match.home_score !== null && match.away_score !== null && (
                  <>
                    {' '}
                    &middot; final score {match.home_score}-{match.away_score}
                  </>
                )}
              </p>
            </div>

            {!primaryPrediction && (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-white/10 py-10 text-center">
                <p className="text-[11px] text-zinc-400">No prediction has been generated for this match yet.</p>
              </div>
            )}

            {/* Stacked, not side-by-side -- the analysis panel below now
             * has 9 real stat sections in its own responsive grid, which
             * needs real viewport width to lay out 2-across without
             * getting cramped. A 50/50 split next to the (much shorter)
             * predictions panel would leave it fighting for space it
             * doesn't have. */}
            {primaryPrediction && <MultiMarketPanel prediction={primaryPrediction} />}
            {predictions && <ModelComparisonPanel predictions={predictions} />}
            {primaryPrediction && <PredictionRationale match={match} prediction={primaryPrediction} />}
            <MatchContextPanel match={match} />
          </>
        )}
      </div>
    </div>
  )
}
