import { useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { Alert01Icon, TestTube01Icon } from '@hugeicons/core-free-icons'
import { fetchStrategyBacktests } from '../lib/api'
import type { StrategyBacktest, StrategyFoldStat } from '../types'

function pct(value: number | null, digits = 2): string {
  if (value === null || value === undefined) return '—'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(digits)}%`
}

const ODDS_BUCKET_LABELS = ['1.00-1.50', '1.50-1.80', '1.80-2.00', '2.00-2.50', '2.50-3.00', '3.00-4.00', '4.00+']

function BreakdownTable({ title, data }: { title: string; data: Record<string, StrategyFoldStat> }) {
  const entries = Object.entries(data).filter(([, s]) => s.bets > 0)
  if (entries.length === 0) return null
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] font-medium uppercase tracking-wide text-zinc-500">{title}</span>
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-zinc-500">
              <th className="px-1.5 py-0.5 text-left font-medium">Bucket</th>
              <th className="px-1.5 py-0.5 text-right font-medium">Bets</th>
              <th className="px-1.5 py-0.5 text-right font-medium">Win %</th>
              <th className="px-1.5 py-0.5 text-right font-medium">ROI</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, s]) => (
              <tr key={key} className="border-t border-white/[0.04]">
                <td className="px-1.5 py-0.5 text-zinc-400">{key}</td>
                <td className="px-1.5 py-0.5 text-right text-zinc-300">{s.bets}</td>
                <td className="px-1.5 py-0.5 text-right text-zinc-300">{s.win_rate_pct?.toFixed(1) ?? '—'}%</td>
                <td className={`px-1.5 py-0.5 text-right font-medium ${(s.roi_pct ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {pct(s.roi_pct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ConfigRow({ row, expanded, onToggle }: { row: StrategyBacktest; expanded: boolean; onToggle: () => void }) {
  const roiPositive = (row.roi_pct ?? 0) >= 0

  // A real edge should hold up across most folds, not be carried by one --
  // flag rows where a single season's ROI accounts for more than the
  // whole aggregate's worth of profit while others are flat/negative.
  const foldRois = row.fold_breakdown ? Object.values(row.fold_breakdown).map((f) => f.roi_pct ?? 0) : []
  const negativeFolds = foldRois.filter((r) => r < 0).length
  const singleFoldDriven = roiPositive && foldRois.length > 1 && negativeFolds >= Math.ceil(foldRois.length / 2)

  return (
    <>
      <tr
        className="cursor-pointer border-t border-white/[0.06] transition-colors hover:bg-white/[0.02]"
        onClick={onToggle}
      >
        <td className="px-2 py-1.5 text-zinc-300">{row.staking_method === 'kelly' ? `1/4 Kelly` : 'Flat (1u)'}</td>
        <td className="px-2 py-1.5 text-right text-zinc-300">{row.edge_threshold_pct.toFixed(0)}%</td>
        <td className="px-2 py-1.5 text-right text-zinc-300">{row.odds_cap ? `≤${row.odds_cap.toFixed(1)}` : 'none'}</td>
        <td className="px-2 py-1.5 text-right text-zinc-300">{row.total_bets}</td>
        <td className="px-2 py-1.5 text-right text-zinc-300">{row.win_rate_pct?.toFixed(1) ?? '—'}%</td>
        <td className={`px-2 py-1.5 text-right font-semibold ${roiPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
          {pct(row.roi_pct, 2)}
          {singleFoldDriven && (
            <span title="Positive aggregate, but at least half the folds were negative -- likely carried by one season, not a stable edge.">
              {' '}
              ⚠
            </span>
          )}
        </td>
        <td className="px-2 py-1.5 text-right text-zinc-400">{row.max_drawdown_pct?.toFixed(1) ?? '—'}%</td>
        <td className="px-2 py-1.5 text-right text-zinc-500">{row.avg_odds?.toFixed(2) ?? '—'}</td>
        <td className="px-2 py-1.5 text-right text-zinc-400">
          {row.p_value !== null ? row.p_value.toFixed(4) : '—'}
          {row.p_value !== null && row.p_value < 0.05 && singleFoldDriven && (
            <span title="Low p-value, but this result is carried by one fold -- the p-value assumes independent bets, which isn't true within a season, so it overstates confidence here. Not evidence of a real edge.">
              {' '}
              ⚠
            </span>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-white/[0.04] bg-white/[0.015]">
          <td colSpan={9} className="px-3 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
              {row.fold_breakdown && <BreakdownTable title="By fold (season)" data={row.fold_breakdown} />}
              {row.odds_bucket_breakdown && <BreakdownTable title="By odds bucket" data={row.odds_bucket_breakdown} />}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

/**
 * Strategy Lab backtest sweep (PROJECT.md section 6v) -- edge-threshold x
 * odds-cap x staking-method sweep against the walk-forward blend_v1
 * backtest set (4,656 graded matches, money line). Deliberately shows
 * every configuration side by side, not a "best" one -- the point is to
 * make the known overconfidence-on-long-shots/single-fold-driven-result
 * pattern visible, not to recommend a strategy. Click a row to expand its
 * per-fold and per-odds-bucket breakdown -- that's what separates a
 * config that looks good in aggregate from one that's carried by a single
 * lucky season (flagged inline with a warning glyph).
 */
export function StrategyBacktestPanel() {
  const [rows, setRows] = useState<StrategyBacktest[] | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchStrategyBacktests('money_line')
      .then((result) => !cancelled && setRows(result))
      .catch(() => !cancelled && setRows([]))
    return () => {
      cancelled = true
    }
  }, [])

  const flatRows = useMemo(() => rows?.filter((r) => r.staking_method === 'flat') ?? [], [rows])
  const kellyRows = useMemo(() => rows?.filter((r) => r.staking_method === 'kelly') ?? [], [rows])

  if (rows === null) {
    return <div className="skeleton h-24" />
  }

  if (rows.length === 0) {
    return (
      <div className="surface flex flex-col gap-1 p-4">
        <div className="flex items-center gap-2">
          <HugeiconsIcon icon={TestTube01Icon} size={14} strokeWidth={1.5} className="text-accent-400" />
          <h2 className="text-[12px] font-semibold tracking-tight text-zinc-200">Strategy backtest sweep</h2>
        </div>
        <p className="text-[10px] text-zinc-500">
          No sweep results yet -- run <code className="rounded bg-white/5 px-1 py-0.5">Analysis/run_staking_strategy_sweep.py</code>.
        </p>
      </div>
    )
  }

  return (
    <div className="surface flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={TestTube01Icon} size={14} strokeWidth={1.5} className="text-accent-400" />
        <h2 className="text-[12px] font-semibold tracking-tight text-zinc-200">Strategy backtest sweep -- money line</h2>
      </div>

      <div className="flex items-start gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
        <HugeiconsIcon icon={Alert01Icon} size={14} strokeWidth={1.5} className="mt-0.5 shrink-0 text-amber-400" />
        <p className="text-[10px] leading-relaxed text-amber-200/80">
          Research results, not bet advice. This project's betting-edge question on major-league markets is formally
          CLOSED (no validated edge across every angle tried -- 1X2, odds caps, margin thresholds, Kelly, market-wide
          CLV screens). Some rows below show positive aggregate ROI, but check the per-fold breakdown (click a row)
          before reading anything into it: several are carried almost entirely by a single season (2023/24) while
          other folds are flat or losing -- the opposite of what a real, stable edge should look like. The p-value
          column (probability this profit happens by chance if the market is fair) looks low for several of those
          same rows -- but that's misleading, not reassuring: the calculation assumes each bet is independent, which
          isn't true when one season's form is driving most of the result, so it understates how surprising a
          single-fold-driven run really is. Low p-value plus the fold-inconsistency flag (⚠) together means "looks
          significant on paper, still not a real edge," not "significant, so it's real." Bets are simulated at each
          match's closing odds (the only historical price available), which is optimistic versus a real bettor taking
          an earlier, worse price.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-zinc-500">
              <th className="px-2 py-1 text-left font-medium">Staking</th>
              <th className="px-2 py-1 text-right font-medium">Edge ≥</th>
              <th className="px-2 py-1 text-right font-medium">Odds cap</th>
              <th className="px-2 py-1 text-right font-medium">Bets</th>
              <th className="px-2 py-1 text-right font-medium">Win %</th>
              <th className="px-2 py-1 text-right font-medium">ROI (per stake)</th>
              <th className="px-2 py-1 text-right font-medium">Max drawdown</th>
              <th className="px-2 py-1 text-right font-medium">Avg odds</th>
              <th className="px-2 py-1 text-right font-medium" title="Probability this profit happens by chance if the market is fair -- not proof of an edge alone, see fold breakdown">
                p-value
              </th>
            </tr>
          </thead>
          <tbody>
            {[...flatRows, ...kellyRows].map((row) => (
              <ConfigRow
                key={row.id}
                row={row}
                expanded={expandedId === row.id}
                onToggle={() => setExpandedId(expandedId === row.id ? null : row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[9px] leading-relaxed text-zinc-600">
        Bankroll: 100 units, 1 unit per qualifying bet (flat) or 1/4 Kelly fraction of current bankroll (kelly).
        ROI is profit / total staked, the correct per-stake definition, not per-bankroll. {ODDS_BUCKET_LABELS.length}{' '}
        odds buckets and {rows[0]?.fold_breakdown ? Object.keys(rows[0].fold_breakdown).length : 0} walk-forward folds
        available per row -- expand a row to see both.
      </p>
    </div>
  )
}
