import { HugeiconsIcon } from '@hugeicons/react'
import { SparklesIcon, Alert02Icon } from '@hugeicons/core-free-icons'
import type { Prediction } from '../types'

/**
 * Visually distinguishes a production-trained forecast (real, unplayed
 * fixture, not separately re-validated against a holdout -- PROJECT.md
 * section 6j) from a walk-forward-validated backtest prediction. Renders
 * nothing for backtest predictions (is_forecast === false) -- the
 * majority case stays unmarked, the minority (forecast) is the one that
 * needs calling out.
 */
// A real match is over well within 3 hours of kickoff (90 minutes +
// stoppage/extra time + a comfortable margin). Past that, calling it
// "Live" is just wrong, not merely stale -- real bug found live
// (PROJECT.md changelog): a match still showed "Live" four days after
// kickoff, because football-data.co.uk simply hadn't published that
// result yet (a genuine gap on their end, confirmed directly against
// their raw data -- nothing this project's own pipeline can force) and
// ESPN's own scoreboard stops returning a match at all after a few days,
// so sync_scores.py had no source left to check. "Live" and "long
// overdue" need to read as different things, not the same badge.
const LIVE_WINDOW_MS = 3 * 60 * 60 * 1000

export function ForecastBadge({ prediction }: { prediction: Prediction }) {
  if (!prediction.is_forecast) return null
  const kickoffMs = prediction.match_date !== null ? new Date(prediction.match_date).getTime() : null
  const msSinceKickoff = kickoffMs !== null ? Date.now() - kickoffMs : null
  const isLive = msSinceKickoff !== null && msSinceKickoff >= 0 && msSinceKickoff < LIVE_WINDOW_MS && prediction.home_score === null
  const isOverdue = msSinceKickoff !== null && msSinceKickoff >= LIVE_WINDOW_MS && prediction.home_score === null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {isLive && (
        <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-rose-300">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_4px_1px_rgba(251,113,133,0.7)]" />
          Live
        </span>
      )}
      {isOverdue && (
        <span
          className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-amber-300"
          title="This match has finished, but our data sources haven't published the real result yet -- not something this app can force. It'll move to the Lab automatically once they do."
        >
          Result pending
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-md border border-accent-500/30 bg-accent-500/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-accent-300">
        <HugeiconsIcon icon={SparklesIcon} size={10} strokeWidth={1.5} />
        Forecast
      </span>
      {prediction.elo_imputed && (
        <span
          className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-medium text-amber-300"
          title="One team in this match has no Elo strength rating on record (usually a newly-promoted or newly-tracked club) -- a neutral 'assume equal strength' default was used instead of a real number for that input. Elo is normally one of the model's stronger signals, so treat this specific forecast as less reliable than a matchup where both teams' ratings are real."
        >
          <HugeiconsIcon icon={Alert02Icon} size={10} strokeWidth={1.5} />
          Team rating unknown
        </span>
      )}
    </div>
  )
}
