import type { Prediction } from '../types'
import { formatPct } from '../lib/format'

// Real gap found live (PROJECT.md 6-ap/6-aq): unified_scoreline_v1 is
// written for every forecast alongside blend_no_market_forecast_v1, but
// MODEL_VERSION_PREFERENCE (markets.ts) always picks ONE row to show on
// every other page, silently discarding the rest -- so a second, real
// model version was landing in the database with no way for a user to
// ever see it. This panel is the one place that shows every forecast
// model a match has, side by side, instead of collapsing to one.
const MODEL_LABELS: Record<string, string> = {
  blend_no_market_forecast_v1: 'Classifier + blend (current primary)',
  unified_scoreline_v1: 'Unified scoreline (experimental)',
  blend_v1: 'Validated blend',
  goals_engine_v1: 'Goals engine (Dixon-Coles)',
}

function modelLabel(modelVersion: string): string {
  return MODEL_LABELS[modelVersion] ?? modelVersion
}

/**
 * Shows every forecast row a match has, side by side, whenever there's
 * more than one -- otherwise renders nothing (a match with a single
 * forecast model has nothing to compare, and the primary prediction
 * panel above already covers it).
 */
export function ModelComparisonPanel({ predictions }: { predictions: Prediction[] }) {
  const forecastRows = predictions.filter((p) => p.is_forecast)
  if (forecastRows.length < 2) return null

  return (
    <div className="surface flex flex-col gap-3 p-5">
      <div>
        <h3 className="text-[11px] font-medium text-zinc-100">Model comparison</h3>
        <p className="mt-1 text-[9px] leading-relaxed text-zinc-600">
          This match has more than one forecast model. Only one is shown as the primary prediction above -- every one is here,
          side by side, so nothing is hidden.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {forecastRows.map((p) => (
          <div key={p.model_version} className="surface-nested flex flex-col gap-2 px-3 py-2.5">
            <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">{modelLabel(p.model_version)}</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['Home', p.predicted_home_prob],
                  ['Draw', p.predicted_draw_prob],
                  ['Away', p.predicted_away_prob],
                ] as const
              ).map(([label, prob]) => (
                <div key={label} className="flex flex-col items-center gap-0.5">
                  <span className="text-[8px] uppercase tracking-wide text-zinc-600">{label}</span>
                  <span className="font-mono text-[11px] font-semibold text-zinc-200">{formatPct(prob)}</span>
                </div>
              ))}
            </div>
            {(p.over_2_5_prob !== null || p.btts_yes_prob !== null) && (
              <div className="flex flex-col gap-1 border-t border-white/5 pt-2">
                {p.over_2_5_prob !== null && (
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>Over 2.5</span>
                    <span className="font-mono text-zinc-300">{formatPct(p.over_2_5_prob)}</span>
                  </div>
                )}
                {p.btts_yes_prob !== null && (
                  <div className="flex items-center justify-between text-[9px] text-zinc-500">
                    <span>BTTS Yes</span>
                    <span className="font-mono text-zinc-300">{formatPct(p.btts_yes_prob)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
