import { formatOdds, formatPct } from '../lib/format'

/**
 * A single binary-market readout (over/under a goal line, BTTS,
 * a team's total) -- reuses the same visual language as ProbabilityBar
 * (thin segmented bar + percentage labels) for a 2-outcome market. Always
 * a calibrated probability display, never a bet recommendation. Real
 * odds (`yesOdds`/`noOdds`) are optional -- most markets/rows don't have
 * them (a book has to have priced that specific market), and the bar
 * still reads fine on probability alone when they're absent.
 */
export function MarketBar({
  label,
  yesLabel,
  noLabel,
  yesProb,
  yesOdds,
  noOdds,
  oddsSource,
  oddsEstimated = false,
  oddsDisplay = 'pair',
}: {
  label: string
  yesLabel: string
  noLabel: string
  yesProb: number | null
  yesOdds?: number | null
  noOdds?: number | null
  /** Same distinction as OutcomeCell's oddsSource -- 'forecast_time'
   * gets a footnote marker so a pre-match price is never confused with a
   * real closing line (PROJECT.md 6s). */
  oddsSource?: 'closing' | 'forecast_time' | null
  /** True for double chance specifically -- these odds are DERIVED from
   * the real money-line price, not a directly quotable market price
   * (PROJECT.md 6-ah). Shown with a "~" prefix and its own footnote
   * instead of the forecast-time "*" marker, since the estimation is a
   * different caveat than "real price, just captured early." */
  oddsEstimated?: boolean
  /** 'pair' (default): yesOdds/noOdds are real complementary sides of one
   * bet (Over/Under, BTTS Yes/No) -- shown side by side. 'single': this
   * card IS its own distinct bet (a double-chance option like "1X") --
   * `noOdds` is a DIFFERENT bet entirely (the one remaining outcome, e.g.
   * "Away alone"), not this one's other side, so showing it here would
   * read as if it were part of the same price. Only `yesOdds` is shown,
   * centered, one number for one bet -- matching how a real sportsbook
   * prices double chance (PROJECT.md changelog). */
  oddsDisplay?: 'pair' | 'single'
}) {
  if (yesProb === null) {
    return (
      <div className="surface-nested flex flex-col gap-1.5 px-3 py-2.5">
        <span className="text-[10px] font-medium text-zinc-400">{label}</span>
        <span className="text-[11px] text-zinc-600">Not available</span>
      </div>
    )
  }

  const noProb = 1 - yesProb
  const hasPairOdds = oddsDisplay === 'pair' && typeof yesOdds === 'number' && typeof noOdds === 'number'
  const hasSingleOdds = oddsDisplay === 'single' && typeof yesOdds === 'number'

  return (
    <div className="surface-nested flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-400">{label}</span>
        <span className="font-mono text-[11px] font-semibold text-accent-300">{formatPct(yesProb)}</span>
      </div>
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
        <div className="h-full bg-gradient-to-r from-accent-400 to-accent-600" style={{ width: `${yesProb * 100}%` }} />
        <div className="h-full bg-gradient-to-r from-zinc-600 to-zinc-700" style={{ width: `${noProb * 100}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-zinc-600">
        <span>
          {yesLabel} {formatPct(yesProb)}
        </span>
        <span>
          {noLabel} {formatPct(noProb)}
        </span>
      </div>
      {hasPairOdds && (
        <div className="flex justify-between border-t border-white/[0.05] pt-1 font-mono text-[9px] text-zinc-500">
          <span>
            {oddsEstimated && '~'}
            {formatOdds(yesOdds)}
            {oddsSource === 'forecast_time' && <span className="text-accent-400">*</span>}
          </span>
          <span>
            {oddsEstimated && '~'}
            {formatOdds(noOdds)}
            {oddsSource === 'forecast_time' && <span className="text-accent-400">*</span>}
          </span>
        </div>
      )}
      {hasSingleOdds && (
        <div className="flex items-center justify-center gap-1 border-t border-white/[0.05] pt-1 font-mono text-[9px] text-zinc-500">
          <span>Odds</span>
          <span className="font-semibold text-zinc-300">
            {oddsEstimated && '~'}
            {formatOdds(yesOdds)}
            {oddsSource === 'forecast_time' && <span className="text-accent-400">*</span>}
          </span>
        </div>
      )}
    </div>
  )
}
