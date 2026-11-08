import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowLeft01Icon, ArrowRight01Icon, Idea01Icon, MinusSignIcon } from '@hugeicons/core-free-icons'
import type { MatchDetail, Prediction } from '../types'
import { buildRationale, type Signal } from '../lib/rationale'
import { formatPct } from '../lib/format'

function DirectionChip({ favors, homeTeam, awayTeam }: { favors: Signal['favors']; homeTeam: string; awayTeam: string }) {
  if (favors === 'neutral') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-medium text-zinc-500">
        <HugeiconsIcon icon={MinusSignIcon} size={10} strokeWidth={2} />
        Even
      </span>
    )
  }
  const team = favors === 'home' ? homeTeam : awayTeam
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-accent-500/25 bg-accent-500/[0.08] px-1.5 py-0.5 text-[9px] font-medium text-accent-300">
      {favors === 'home' && <HugeiconsIcon icon={ArrowLeft01Icon} size={10} strokeWidth={2.5} />}
      {team}
      {favors === 'away' && <HugeiconsIcon icon={ArrowRight01Icon} size={10} strokeWidth={2.5} />}
    </span>
  )
}

function SignalRow({ signal, homeTeam, awayTeam }: { signal: Signal; homeTeam: string; awayTeam: string }) {
  const { homeValue, awayValue, format } = signal
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <div className="flex min-w-0 flex-col">
        <span className="text-[10.5px] text-zinc-300">{signal.label}</span>
        <span className="font-mono text-[9px] text-zinc-600">
          {homeValue === null ? '—' : format(homeValue)} vs {awayValue === null ? '—' : format(awayValue)}
        </span>
      </div>
      <DirectionChip favors={signal.favors} homeTeam={homeTeam} awayTeam={awayTeam} />
    </div>
  )
}

/**
 * "Why is the model favoring this side" -- every line here is a real,
 * already-computed number pulled straight off the match record (Elo,
 * season PPG, recent form, goal/xG difference, head-to-head), never a
 * generated claim on top of them. Deliberately not another model or a
 * free-text explanation: a simple, verifiable scorecard of which real
 * signals point which way, so the reasoning can be checked against the
 * raw stats sections on the same page, not taken on faith.
 *
 * A draw favorite gets its own framing -- these signals are inherently
 * home-vs-away comparisons, so "N of M agree with the pick" doesn't mean
 * anything when the pick itself is a draw; closeness across the signals
 * is itself the story there.
 */
export function PredictionRationale({ match, prediction }: { match: MatchDetail; prediction: Prediction }) {
  const rationale = buildRationale(match, prediction)
  const { favoredSide, favoredProb, signals, determinateSignals, agreeingCount } = rationale
  const favoredTeam = favoredSide === 'home' ? match.home_team : favoredSide === 'away' ? match.away_team : null

  return (
    <div className="surface flex flex-col gap-3 p-5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        <HugeiconsIcon icon={Idea01Icon} size={13} strokeWidth={1.5} />
        Why the model favors this pick
      </div>

      {favoredSide === 'draw' ? (
        <p className="text-[11px] leading-relaxed text-zinc-300">
          The model sees this as a close matchup -- a draw is the single most likely outcome at{' '}
          <span className="font-semibold text-zinc-100">{formatPct(favoredProb)}</span>, even though no side clears
          50% on its own. That tracks with the signals below: {determinateSignals.length === 0
            ? "none of them show a clear lean either way."
            : `only ${determinateSignals.length} of ${signals.length} show a clear lean, and they don't agree on a direction.`}
        </p>
      ) : (
        <p className="text-[11px] leading-relaxed text-zinc-300">
          <span className="font-semibold text-zinc-100">{favoredTeam}</span> favored at{' '}
          <span className="font-semibold text-zinc-100">{formatPct(favoredProb)}</span> --{' '}
          <span className="font-semibold text-zinc-100">
            {agreeingCount} of {determinateSignals.length}
          </span>{' '}
          real signals with a clear lean point the same way.
        </p>
      )}

      <div className="flex flex-col divide-y divide-white/[0.06] border-t border-white/[0.06] pt-1">
        {signals.map((signal) => (
          <SignalRow key={signal.key} signal={signal} homeTeam={match.home_team ?? 'Home'} awayTeam={match.away_team ?? 'Away'} />
        ))}
      </div>

      <p className="text-[9px] leading-relaxed text-zinc-600">
        Each row is a real number already on this match's record, not a generated claim -- "Even" means the two
        sides are close enough on that signal, or one side doesn't have enough data yet, not that the signal is
        missing. This isn't every input the model uses (some, like squad dependence, aren't clear-cut a single
        direction), just the ones a person can sanity-check directly.
      </p>
    </div>
  )
}
