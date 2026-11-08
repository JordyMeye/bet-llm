import { useState } from 'react'
import type { Prediction } from '../types'
import { formatOdds, formatPct, impliedProb } from '../lib/format'
import { ProbabilityBar } from './ProbabilityBar'
import { MarketBar } from './MarketBar'
import { ForecastBadge } from './ForecastBadge'
import { MarketTabs } from './MarketTabs'
import {
  doubleChanceOdds,
  doubleChanceProbs,
  marketModelLabel,
  resolveBttsOdds,
  resolveDisplayOdds,
  resolveOverUnderOdds,
  type MarketId,
} from '../lib/markets'

function MoneyLineContent({ prediction }: { prediction: Prediction }) {
  const p = prediction
  const odds = resolveDisplayOdds(p)
  return (
    <div className="flex flex-col gap-3">
      <ProbabilityBar home={p.predicted_home_prob} draw={p.predicted_draw_prob} away={p.predicted_away_prob} />
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['Home', p.predicted_home_prob, odds.home],
            ['Draw', p.predicted_draw_prob, odds.draw],
            ['Away', p.predicted_away_prob, odds.away],
          ] as const
        ).map(([label, prob, o]) => (
          <div key={label} className="surface-nested flex flex-col gap-1 px-2.5 py-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
              <span
                className="font-mono text-[11px] font-semibold text-zinc-200"
                title={odds.source === 'forecast_time' ? 'Pre-match price at forecast time, not a closing price' : undefined}
              >
                {formatOdds(o)}
                {odds.source === 'forecast_time' && <span className="text-accent-400">*</span>}
              </span>
            </div>
            <div className="text-[12px] font-semibold text-zinc-100">{formatPct(prob)}</div>
            <div className="text-[9px] text-zinc-600">market {formatPct(impliedProb(o))}</div>
          </div>
        ))}
      </div>
      {odds.source === 'forecast_time' && (
        <p className="text-[9px] text-zinc-600">* pre-match price at forecast time, not a closing price</p>
      )}
    </div>
  )
}

/**
 * All markets for one match, derived from the calibrated blend
 * (money line) and the goals engine's own scoreline matrix (everything
 * else) -- PROJECT.md section 6d-6g/6k. Every number here is a
 * probability ESTIMATE. Nothing on this panel is a recommended bet: no
 * edge, no EV, no "back this" -- see section 6f for why (no validated
 * edge on any market tested). The market tabs are the primary control;
 * the model that produced the current tab's numbers is a small label
 * underneath, not something you have to pick.
 */
export function MultiMarketPanel({ prediction }: { prediction: Prediction }) {
  const p = prediction
  const [market, setMarket] = useState<MarketId>('moneyline')

  return (
    <div className="surface flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium text-zinc-100">Match result</h3>
        <ForecastBadge prediction={p} />
      </div>

      <MarketTabs prediction={p} selected={market} onSelect={setMarket} />

      {market === 'moneyline' && <MoneyLineContent prediction={p} />}

      {market === 'double_chance' &&
        (() => {
          const dc = doubleChanceProbs(p)
          const dcOdds = doubleChanceOdds(p)
          return (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <MarketBar
                  label="1X (Home or Draw)"
                  yesLabel="Covers"
                  noLabel="Away"
                  yesProb={dc.oneX}
                  yesOdds={dcOdds.oneX}
                  oddsSource={dcOdds.baseSource}
                  oddsEstimated
                  oddsDisplay="single"
                />
                <MarketBar
                  label="12 (Home or Away)"
                  yesLabel="Covers"
                  noLabel="Draw"
                  yesProb={dc.onetwo}
                  yesOdds={dcOdds.onetwo}
                  oddsSource={dcOdds.baseSource}
                  oddsEstimated
                  oddsDisplay="single"
                />
                <MarketBar
                  label="X2 (Draw or Away)"
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
        })()}

      {market === 'over_under' &&
        (() => {
          const ou25 = resolveOverUnderOdds(p)
          return (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-3 gap-2">
                <MarketBar label="Over/Under 1.5" yesLabel="Over" noLabel="Under" yesProb={p.over_1_5_prob} />
                <MarketBar
                  label="Over/Under 2.5"
                  yesLabel="Over"
                  noLabel="Under"
                  yesProb={p.over_2_5_prob}
                  yesOdds={ou25.yes}
                  noOdds={ou25.no}
                  oddsSource={ou25.source}
                />
                <MarketBar label="Over/Under 3.5" yesLabel="Over" noLabel="Under" yesProb={p.over_3_5_prob} />
              </div>
              {ou25.source === 'forecast_time' && (
                <p className="text-[9px] text-zinc-600">* pre-match price at forecast time, not a closing price</p>
              )}
            </div>
          )
        })()}

      {market === 'btts' &&
        (() => {
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
        })()}

      {market === 'team_totals' && (
        <div className="grid grid-cols-2 gap-2">
          <MarketBar
            label={`${p.home_team ?? 'Home'} over 1.5`}
            yesLabel="Over"
            noLabel="Under"
            yesProb={p.home_over_1_5_prob}
          />
          <MarketBar
            label={`${p.away_team ?? 'Away'} over 1.5`}
            yesLabel="Over"
            noLabel="Under"
            yesProb={p.away_over_1_5_prob}
          />
        </div>
      )}

      <div className="flex items-center justify-between border-t border-white/[0.06] pt-4">
        <span className="font-mono text-[9px] text-zinc-600">via {marketModelLabel(p, market)}</span>
        <p className="text-right text-[9px] leading-relaxed text-zinc-600">
          Calibrated estimate, not betting advice -- no validated edge found.
        </p>
      </div>
    </div>
  )
}
