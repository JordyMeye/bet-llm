import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  ChartLineIcon,
  CalendarDaysIcon,
  ShieldIcon,
  UserGroupIcon,
  FootballIcon,
  PercentIcon,
  AwardIcon,
  BarChartIcon,
  GitCompareIcon,
} from '@hugeicons/core-free-icons'
import { useEffect, useState } from 'react'
import { pingApi } from '../lib/api'
import { SystemStatusWidget } from './SystemStatusWidget'

export type Tab =
  | 'money_line'
  | 'double_chance'
  | 'over_under'
  | 'btts'
  | 'team_totals'
  | 'matches'
  | 'teams'
  | 'players'

type NavItem = { id: Tab; label: string; icon: IconSvgElement; soon?: boolean }

/**
 * Sport is the top level, sub-views nest underneath it. Only Football
 * exists today, but every sub-view belongs to it structurally, not to
 * the app root -- a second sport would slot in as a sibling entry in
 * SPORTS, each with its own `sections` list, without touching this
 * rendering logic.
 *
 * The four market tabs (Money Line, Over/Under, BTTS, Team Totals)
 * replace a single "Predictions" tab that used to hide the market
 * choice behind a model_version dropdown. The market is the primary
 * control now: clicking Football surfaces the markets directly, and
 * which model produced the numbers is just a small label on each card
 * (see MarketTabs / lib/markets.ts).
 */
const SPORTS: { id: string; label: string; icon: IconSvgElement; sections: NavItem[] }[] = [
  {
    id: 'football',
    label: 'Football',
    icon: FootballIcon,
    sections: [
      { id: 'money_line', label: 'Money Line', icon: ChartLineIcon },
      { id: 'double_chance', label: 'Double Chance', icon: GitCompareIcon },
      { id: 'over_under', label: 'Over/Under', icon: PercentIcon },
      { id: 'btts', label: 'BTTS', icon: AwardIcon },
      { id: 'team_totals', label: 'Team Totals', icon: BarChartIcon },
      { id: 'matches', label: 'Matches', icon: CalendarDaysIcon, soon: true },
      { id: 'teams', label: 'Teams', icon: ShieldIcon },
      { id: 'players', label: 'Players', icon: UserGroupIcon, soon: true },
    ],
  },
]

export function Sidebar({
  active,
  onChange,
}: {
  // null when the Lab (right-side, outside this nav) is showing instead
  // of any of these market tabs -- nothing here should read as "current".
  active: Tab | null
  onChange: (tab: Tab) => void
}) {
  const [apiUp, setApiUp] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    const check = () =>
      pingApi()
        .then(() => !cancelled && setApiUp(true))
        .catch(() => !cancelled && setApiUp(false))
    check()
    const interval = setInterval(check, 15000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [])

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#0b0c10] to-[#08090b] px-3 py-4">
      <div className="flex items-center gap-2 px-2 pb-6 pt-1">
        <img
          src="/favicon.svg"
          alt="Isalys"
          className="h-7 w-7 rounded-lg shadow-[0_0_16px_-2px_var(--color-accent-500)]"
        />
        <span className="bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-[12px] font-semibold tracking-tight text-transparent">
          Isalys
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-4">
        <div>
          <div className="px-2.5 pb-1.5 text-[9px] font-medium uppercase tracking-widest text-zinc-600">
            Sport
          </div>
          {SPORTS.map((sport) => {
            return (
              <div key={sport.id} className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-zinc-200">
                  <HugeiconsIcon icon={sport.icon} size={15} strokeWidth={1.5} className="text-accent-400" />
                  {sport.label}
                </div>
                <div className="ml-[18px] flex flex-col gap-0.5 border-l border-white/[0.08] pl-3">
                  {sport.sections.map((item) => {
                    const isActive = active === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChange(item.id)}
                        className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[11px] font-medium transition-all ${
                          isActive
                            ? 'bg-white/[0.06] text-zinc-50'
                            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                        }`}
                      >
                        <HugeiconsIcon
                          icon={item.icon}
                          size={15}
                          strokeWidth={1.5}
                          className={isActive ? 'text-zinc-300' : 'text-zinc-500 group-hover:text-zinc-300'}
                        />
                        <span className="flex-1">{item.label}</span>
                        {item.soon && (
                          <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-zinc-500">
                            Soon
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </nav>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] px-2.5 py-2 text-[10px] text-zinc-500">
          <span
            className={`h-[7px] w-[7px] shrink-0 rounded-full ${
              apiUp === null
                ? 'bg-zinc-600'
                : apiUp
                  ? 'bg-emerald-400 shadow-[0_0_4px_1px_rgba(52,211,153,0.7)]'
                  : 'bg-red-500 shadow-[0_0_4px_1px_rgba(239,68,68,0.7)]'
            }`}
          />
          <span>
            {apiUp === null ? 'Checking API…' : apiUp ? 'API connected' : 'API unreachable'}
          </span>
        </div>
        <SystemStatusWidget />
      </div>
    </aside>
  )
}
