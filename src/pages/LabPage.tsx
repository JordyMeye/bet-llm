import { useState } from 'react'
import { TestTube01Icon } from '@hugeicons/core-free-icons'
import { MarketPage } from './MarketPage'
import { LivePerformanceHeader } from '../components/LivePerformanceHeader'
import { StrategyBacktestPanel } from '../components/StrategyBacktestPanel'
import { MARKET_TABS, type MarketId } from '../lib/markets'

type Source = 'live' | 'backtest'

const SOURCE_TABS: { id: Source; label: string }[] = [
  { id: 'live', label: 'Live Forecasts' },
  { id: 'backtest', label: 'Backtest' },
]

/**
 * The Lab now holds TWO distinct data sources, picked via this page's own
 * `source` toggle, not two separate nav destinations -- both answer "how's
 * the model actually doing," just from different match sets:
 *
 * - Live Forecasts (is_forecast=true, forecastScope='decided'): ONLY real
 *   forecasts whose match has actually been played and scored -- a
 *   still-upcoming forecast has no result yet, so it stays on its market
 *   tab (Money Line / O-U / BTTS / ...) until it does, never shown here
 *   too. Real bug found live (PROJECT.md 6-af/6-ag): the four "what's
 *   next" nav tabs correctly drop a forecast once its match is decided,
 *   but nothing else ever showed it again -- it effectively vanished
 *   instead of turning into a graded result. This view is that fix, and
 *   ONLY that fix -- a decided forecast appears here with its real score
 *   and Correct/Missed badge, sorted most-recently-decided first (flat
 *   across leagues, not grouped -- the latest result belongs at the very
 *   top regardless of which league it's in). LivePerformanceHeader (the
 *   aggregate accuracy/Brier/CLV summary) lives here too, same
 *   live-forecast population, just aggregated instead of browsable.
 * - Backtest (is_forecast=false): walk-forward-VALIDATED predictions on
 *   already-decided historical matches (section 6o) -- the original Lab.
 *   StrategyBacktestPanel (section 6v, edge/staking research) is scoped
 *   to this historical set, so it only makes sense here.
 *
 * The bet-type filter directly answers a real request: "if I select
 * money line and a team predicted won 1-0 the bet passes, but if I
 * select BTTS the bet failed because both teams didn't score" -- so
 * this page needs its own notion of "which market am I judging right
 * now," not just each card's independent MarketTabs toggle. Picking a
 * market here re-points MarketPage's `market` prop, which drives BOTH
 * which matches even show (marketHasData) and which market each card
 * defaults to/grades its Correct/Missed badge against -- a card can
 * still be flipped to a different market individually, same as before.
 * Shared across both sources rather than reset on switching, since "show
 * me BTTS" is a preference that outlives which population you're looking at.
 */
export function LabPage({ onOpenMatch }: { onOpenMatch: (matchId: number) => void }) {
  const [source, setSource] = useState<Source>('live')
  const [market, setMarket] = useState<MarketId>('moneyline')

  return (
    <MarketPage
      market={market}
      title={source === 'live' ? 'Live Forecasts' : 'Backtest'}
      description={
        source === 'live'
          ? "Real forecasts made ahead of time, now graded against the real result -- the model's actual track record, not a backtest. A still-upcoming forecast lives on its market tab until it's decided."
          : 'Walk-forward-validated predictions on already-decided historical matches -- how the model performs on data it never saw during training.'
      }
      icon={TestTube01Icon}
      isForecast={source === 'live'}
      forecastScope="decided"
      onOpenMatch={onOpenMatch}
      headerSlot={
        <>
          <div className="inline-flex self-start rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
            {SOURCE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSource(tab.id)}
                className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all ${
                  source === tab.id
                    ? 'bg-gradient-to-b from-accent-500/25 to-accent-500/10 text-accent-200 shadow-[0_0_12px_-5px_var(--color-accent-500)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {source === 'live' ? <LivePerformanceHeader /> : <StrategyBacktestPanel />}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">Bet type</span>
            <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
              {MARKET_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMarket(tab.id)}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-all ${
                    market === tab.id
                      ? 'bg-gradient-to-b from-accent-500/25 to-accent-500/10 text-accent-200 shadow-[0_0_12px_-5px_var(--color-accent-500)]'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </>
      }
    />
  )
}
