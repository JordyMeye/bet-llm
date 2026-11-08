import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { ArrowUpRightIcon } from '@hugeicons/core-free-icons'
import { motion } from 'framer-motion'
import type { Prediction } from '../types'
import { formatDate, formatOdds, formatPct, impliedProb } from '../lib/format'
import { ProbabilityBar } from './ProbabilityBar'
import { ForecastBadge } from './ForecastBadge'
import { MarketTabs } from './MarketTabs'
import { MarketBar } from './MarketBar'
import {
  doubleChanceOdds,
  doubleChanceProbs,
  MARKET_TABS,
  marketModelLabel,
  marketPredictionWasCorrect,
  resolveBttsOdds,
  resolveDisplayOdds,
  resolveOverUnderOdds,
  type MarketId,
} from '../lib/markets'

function OutcomeCell({
  label,
  modelProb,
  odds,
  oddsSource,
}: {
  label: string
  modelProb: number
  odds: number | null
  oddsSource: 'closing' | 'forecast_time' | null
}) {
  const market = impliedProb(odds)
  return (
    <div className="surface-nested flex flex-col gap-1 px-2.5 py-2">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
        <span
          className="font-mono text-[11px] font-semibold text-zinc-200"
          title={oddsSource === 'forecast_time' ? 'Pre-match price at forecast time, not a closing price' : undefined}
        >
          {formatOdds(odds)}
          {oddsSource === 'forecast_time' && <span className="text-accent-400">*</span>}
        </span>
      </div>
      <div className="text-[12px] font-semibold text-zinc-100">{formatPct(modelProb)}</div>
      <div className="text-[9px] text-zinc-600">market {formatPct(market)}</div>
    </div>
  )
}

/** Content for whichever market tab is currently selected -- the card's
 * primary control is the market (MarketTabs above it), not the model. */
function MarketContent({ prediction, market }: { prediction: Prediction; market: MarketId }) {
  const p = prediction
  switch (market) {
    case 'moneyline': {
      const odds = resolveDisplayOdds(p)
      return (
        <div className="flex flex-col gap-3">
          <ProbabilityBar home={p.predicted_home_prob} draw={p.predicted_draw_prob} away={p.predicted_away_prob} />
          <div className="grid grid-cols-3 gap-2">
            <OutcomeCell label="Home" modelProb={p.predicted_home_prob} odds={odds.home} oddsSource={odds.source} />
            <OutcomeCell label="Draw" modelProb={p.predicted_draw_prob} odds={odds.draw} oddsSource={odds.source} />
            <OutcomeCell label="Away" modelProb={p.predicted_away_prob} odds={odds.away} oddsSource={odds.source} />
          </div>
          {odds.source === 'forecast_time' && (
            <p className="text-[9px] text-zinc-600">* pre-match price at forecast time, not a closing price</p>
          )}
        </div>
      )
    }
    case 'double_chance': {
      const dc = doubleChanceProbs(p)
      const dcOdds = doubleChanceOdds(p)
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <MarketBar
              label="1X"
              yesLabel="Covers"
              noLabel="Away"
              yesProb={dc.oneX}
              yesOdds={dcOdds.oneX}
              oddsSource={dcOdds.baseSource}
              oddsEstimated
              oddsDisplay="single"
            />
            <MarketBar
              label="12"
              yesLabel="Covers"
              noLabel="Draw"
              yesProb={dc.onetwo}
              yesOdds={dcOdds.onetwo}
              oddsSource={dcOdds.baseSource}
              oddsEstimated
              oddsDisplay="single"
            />
            <MarketBar
              label="X2"
              yesLabel="Covers"
              noLabel="Home"
              yesProb={dc.x2}
              yesOdds={dcOdds.x2}
              oddsSource={dcOdds.baseSource}
              oddsEstimated
              oddsDisplay="single"
            />
          </div>
          {dcOdds.baseSource !== null && (
            <p className="text-[9px] text-zinc-600">
              ~ odds estimated from the real money line, not a directly quoted double-chance price
              {dcOdds.baseSource === 'forecast_time' && ' (* pre-match price at forecast time, not a closing price)'}
            </p>
          )}
        </div>
      )
    }
    case 'over_under': {
      const ou25 = resolveOverUnderOdds(p)
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <MarketBar label="1.5" yesLabel="O" noLabel="U" yesProb={p.over_1_5_prob} />
            <MarketBar
              label="2.5"
              yesLabel="O"
              noLabel="U"
              yesProb={p.over_2_5_prob}
              yesOdds={ou25.yes}
              noOdds={ou25.no}
              oddsSource={ou25.source}
            />
            <MarketBar label="3.5" yesLabel="O" noLabel="U" yesProb={p.over_3_5_prob} />
          </div>
          {ou25.source === 'forecast_time' && (
            <p className="text-[9px] text-zinc-600">* pre-match price at forecast time, not a closing price</p>
          )}
        </div>
      )
    }
    case 'btts': {
      const btts = resolveBttsOdds(p)
      return (
        <div className="flex flex-col gap-2">
          <MarketBar
            label="Both teams to score"
            yesLabel="Yes"
            noLabel="No"
            yesProb={p.btts_yes_prob}
            yesOdds={btts.yes}
            noOdds={btts.no}
            oddsSource={btts.source}
          />
          {btts.source === 'forecast_time' && (
            <p className="text-[9px] text-zinc-600">* pre-match price at forecast time, not a closing price</p>
          )}
        </div>
      )
    }
    case 'team_totals':
      return (
        <div className="grid grid-cols-2 gap-2">
          <MarketBar label={`${p.home_team ?? 'Home'} o/u 1.5`} yesLabel="Over" noLabel="Under" yesProb={p.home_over_1_5_prob} />
          <MarketBar label={`${p.away_team ?? 'Away'} o/u 1.5`} yesLabel="Over" noLabel="Under" yesProb={p.away_over_1_5_prob} />
        </div>
      )
  }
}

// This card only ever shows calibrated probability estimates -- never a
// recommended bet, edge, or expected value. No validated betting edge
// exists on any market this project has tested (PROJECT.md section 6f);
// recommended_bet/edge/expected_value are deliberately not read here.
export function PredictionCard({
  prediction,
  index,
  onOpen,
  defaultMarket = 'moneyline',
}: {
  prediction: Prediction
  index: number
  onOpen?: (matchId: number) => void
  /** Which market tab this card opens on -- e.g. an Over/Under nav page
   * wants its cards to default to "over_under", not "moneyline". Still
   * switchable via MarketTabs; this only sets the initial tab. */
  defaultMarket?: MarketId
}) {
  const p = prediction
  const [market, setMarket] = useState<MarketId>(defaultMarket)
  // Reflects whichever market is currently selected, not always money
  // line -- a 1-0 result passes the money-line tab but fails BTTS, so
  // the badge has to track the tab actually on screen.
  const wasCorrect = marketPredictionWasCorrect(p, market)

  // Money Line and Over/Under (etc.) pages fetch the same underlying
  // prediction rows, so React reuses these card instances by `key={p.id}`
  // across a tab switch instead of remounting them -- the `useState`
  // initializer above only fires once, on first mount, so without this
  // effect a card would keep showing whichever market it last had
  // selected instead of the one the new tab actually asked for. This
  // effect re-syncs the selected market whenever the page's intended
  // default changes, while still leaving a manual MarketTabs click free
  // to override it (it only re-fires when `defaultMarket` itself changes).
  useEffect(() => {
    setMarket(defaultMarket)
  }, [defaultMarket])

  const resultBorderClass =
    wasCorrect === true
      ? 'border-l-2 border-l-emerald-500/70'
      : wasCorrect === false
        ? 'border-l-2 border-l-rose-500/70'
        : ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.5) }}
      className={`surface surface-hover flex flex-col gap-4 p-5 ${resultBorderClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[12px] font-semibold text-zinc-100">
            {p.home_team ?? `Match #${p.match_id}`} <span className="text-zinc-600">vs</span>{' '}
            {p.away_team ?? '—'}
            {p.home_score !== null && p.away_score !== null && (
              <span className="ml-1.5 font-mono text-[11px] font-normal text-zinc-400">
                {p.home_score}-{p.away_score}
              </span>
            )}
          </div>
          <div className="mt-0.5 text-[10px] text-zinc-500">{formatDate(p.match_date)}</div>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <ForecastBadge prediction={p} />
          {wasCorrect !== null && (
            <span
              className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${
                wasCorrect
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
              }`}
              title={`Whether the ${MARKET_TABS.find((t) => t.id === market)?.label ?? market} pick matched the real result.`}
            >
              {wasCorrect ? 'Correct' : 'Missed'}
            </span>
          )}
        </div>
      </div>

      <MarketTabs prediction={p} selected={market} onSelect={setMarket} size="sm" />

      <MarketContent prediction={p} market={market} />

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-3">
        <span className="font-mono text-[9px] text-zinc-600">via {marketModelLabel(p, market)}</span>
        <button
          type="button"
          onClick={() => onOpen?.(p.match_id)}
          className="flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] font-medium text-zinc-300 transition-all hover:border-accent-500/30 hover:bg-gradient-to-r hover:from-accent-500/15 hover:to-transparent hover:text-accent-300 hover:shadow-[0_0_16px_-8px_var(--color-accent-500)]"
        >
          Full analysis
          <HugeiconsIcon icon={ArrowUpRightIcon} size={12} strokeWidth={1.5} />
        </button>
      </div>
    </motion.div>
  )
}
