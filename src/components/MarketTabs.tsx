import type { Prediction } from '../types'
import { MARKET_TABS, marketHasData, type MarketId } from '../lib/markets'

/**
 * Segmented market switcher -- the primary control is the market, not
 * the model (per project direction: no dropdown of raw model_version
 * strings). Shared between the compact card and the full analysis view
 * so both stay in sync visually.
 */
export function MarketTabs({
  prediction,
  selected,
  onSelect,
  size = 'md',
}: {
  prediction: Prediction
  selected: MarketId
  onSelect: (market: MarketId) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.02] p-0.5">
      {MARKET_TABS.map((tab) => {
        const available = marketHasData(prediction, tab.id)
        const isSelected = selected === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            disabled={!available}
            onClick={() => onSelect(tab.id)}
            title={available ? undefined : 'Not available for this prediction'}
            className={`rounded-md font-medium transition-all ${
              size === 'sm' ? 'px-2 py-1 text-[9px]' : 'px-3 py-1.5 text-[11px]'
            } ${
              isSelected
                ? 'bg-gradient-to-b from-accent-500/25 to-accent-500/10 text-accent-200 shadow-[0_0_12px_-5px_var(--color-accent-500)]'
                : available
                  ? 'text-zinc-400 hover:text-zinc-200'
                  : 'cursor-not-allowed text-zinc-700'
            }`}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
