import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Activity01Icon } from '@hugeicons/core-free-icons'
import { fetchLivePerformance } from '../lib/api'
import type { LivePerformance } from '../types'
import { formatDate, formatPct, formatRelativeTime, formatSignedPct } from '../lib/format'

const MARKET_LABELS: Record<string, string> = {
  over_1_5: 'O/U 1.5',
  over_2_5: 'O/U 2.5',
  over_3_5: 'O/U 3.5',
  btts: 'BTTS',
  home_over_1_5: 'Home O/U 1.5',
  away_over_1_5: 'Away O/U 1.5',
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="surface-nested flex flex-col gap-0.5 px-3 py-2">
      <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">{label}</span>
      <span className="text-[13px] font-semibold text-zinc-100">{value}</span>
      {sub && <span className="text-[9px] text-zinc-600">{sub}</span>}
    </div>
  )
}

/**
 * The live forecast track record (PROJECT.md section 6q) -- real
 * accuracy/Brier/log-loss on forecasts that were made ahead of time,
 * then graded once their match was actually played. Deliberately
 * labeled and visually separated from backtest numbers: this is a
 * genuinely different, more credible measurement (no possibility the
 * model "saw" these matches in any form), and conflating the two would
 * misrepresent both. Lives at the top of the Lab page -- the Lab is
 * already framed as "the model's track record," this is the live half
 * of that, backtest browsing is the historical half below it.
 */
export function LivePerformanceHeader() {
  const [data, setData] = useState<LivePerformance | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchLivePerformance()
      .then((result) => !cancelled && setData(result))
      .catch(() => {
        // Non-critical: the Lab's backtest browsing below still works
        // even if this summary fails to load.
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return <div className="skeleton h-28" />
  }

  if (!data || data.n === 0) {
    return (
      <div className="surface flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Activity01Icon} size={14} strokeWidth={1.5} className="text-accent-400" />
          <h2 className="text-[12px] font-semibold tracking-tight text-zinc-200">Live forecast performance</h2>
        </div>
        <p className="text-[10px] leading-relaxed text-zinc-500">
          No graded forecasts yet -- once a forecast's match is actually played,{' '}
          <code className="rounded bg-white/5 px-1 py-0.5">grade_forecasts.py</code> scores it against the real
          result and it shows up here.
        </p>
      </div>
    )
  }

  const marketEntries = Object.entries(data.markets).filter(([, m]) => m.n > 0)

  return (
    <div className="surface flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={Activity01Icon} size={14} strokeWidth={1.5} className="text-accent-400" />
          <h2 className="text-[12px] font-semibold tracking-tight text-zinc-200">Live forecast performance</h2>
        </div>
        <span className="text-[10px] text-zinc-500">
          n={data.n} &middot; since {formatDate(data.since_date)} &middot; last graded{' '}
          {formatRelativeTime(data.last_graded_at)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatTile label="Money line accuracy" value={formatPct(data.money_line.accuracy)} sub={`n=${data.money_line.n}`} />
        <StatTile label="Money line Brier" value={data.money_line.brier?.toFixed(3) ?? '—'} />
        <StatTile label="Money line log loss" value={data.money_line.log_loss?.toFixed(3) ?? '—'} />
      </div>

      {marketEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {marketEntries.map(([key, m]) => (
            <StatTile
              key={key}
              label={MARKET_LABELS[key] ?? key}
              value={formatPct(m.accuracy)}
              sub={`Brier ${m.brier?.toFixed(3) ?? '—'} · n=${m.n}`}
            />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-1.5 border-t border-white/[0.06] pt-3">
        <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">
          Odds-derived signals -- honesty/quality only, not bet advice
        </span>
        <div className="flex flex-wrap gap-2">
          <StatTile
            label="Edge vs. closing market (A)"
            value={data.edge_vs_closing_market.n > 0 ? formatSignedPct(data.edge_vs_closing_market.mean_pct) : '—'}
            sub={
              data.edge_vs_closing_market.n > 0
                ? `n=${data.edge_vs_closing_market.n} · not true CLV`
                : 'awaiting closing odds on graded matches'
            }
          />
          <StatTile
            label="True CLV (B, forward-only)"
            value={data.true_clv.n > 0 ? formatSignedPct(data.true_clv.mean_pct) : '—'}
            sub={
              data.true_clv.n > 0
                ? `n=${data.true_clv.n}`
                : 'accrues only from forecasts made after capture was enabled'
            }
          />
        </div>
      </div>

      <p className="text-[9px] leading-relaxed text-zinc-600">
        Real, walk-forward-blind performance -- separate from the backtest numbers below. Not betting advice.
      </p>
    </div>
  )
}
