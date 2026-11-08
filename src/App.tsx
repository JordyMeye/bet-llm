import { useState } from 'react'
import type { IconSvgElement } from '@hugeicons/react'
import { ChartLineIcon, PercentIcon, AwardIcon, BarChartIcon, GitCompareIcon } from '@hugeicons/core-free-icons'
import { Sidebar, type Tab } from './components/Sidebar'
import { LabRail } from './components/LabRail'
import { MarketPage } from './pages/MarketPage'
import { LabPage } from './pages/LabPage'
import { TeamsPage } from './pages/TeamsPage'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { MatchDetailView } from './pages/MatchDetailView'
import type { MarketId } from './lib/markets'

const TAB_TITLES: Record<Tab, string> = {
  money_line: 'Money Line',
  double_chance: 'Double Chance',
  over_under: 'Over/Under',
  btts: 'BTTS',
  team_totals: 'Team Totals',
  matches: 'Matches',
  teams: 'Teams',
  players: 'Players',
}

// One MarketPage instantiation per left-nav market tab -- same page
// component, scoped to a fixed market (PROJECT.md 6m). All four now
// show real upcoming fixtures (isForecast=true, PROJECT.md 6o): the
// model is trained on all history up to today specifically so it can
// predict what's next, so "what's next" is the default product, not a
// side view. The historical, walk-forward-VALIDATED predictions on
// already-decided matches (is_forecast=false) still exist -- see the
// Lab below -- just no longer mixed into these tabs.
const MARKET_TAB_CONFIG: Partial<Record<Tab, { market: MarketId; description: string; icon: IconSvgElement }>> = {
  money_line: {
    market: 'moneyline',
    description: 'Calibrated 1X2 win/draw/loss forecasts for real upcoming fixtures. Not betting advice -- no validated edge exists.',
    icon: ChartLineIcon,
  },
  double_chance: {
    market: 'double_chance',
    description: 'Double chance (1X / X2 / 12) forecasts for real upcoming fixtures -- a direct sum of the money line\'s own home/draw/away probabilities, not a separately trained market.',
    icon: GitCompareIcon,
  },
  over_under: {
    market: 'over_under',
    description: 'Calibrated over/under 1.5, 2.5, 3.5 goal forecasts for real upcoming fixtures, from the Dixon-Coles goals engine.',
    icon: PercentIcon,
  },
  btts: {
    market: 'btts',
    description: 'Calibrated both-teams-to-score forecasts for real upcoming fixtures, from the Dixon-Coles goals engine.',
    icon: AwardIcon,
  },
  team_totals: {
    market: 'team_totals',
    description: 'Calibrated per-team over/under 1.5 goal forecasts for real upcoming fixtures, from the Dixon-Coles goals engine.',
    icon: BarChartIcon,
  },
}

function App() {
  const [tab, setTab] = useState<Tab>('money_line')
  const [selectedMatchId, setSelectedMatchId] = useState<number | null>(null)
  // Lab is a separate context from the sport/market nav, not a fifth tab
  // in it (PROJECT.md 6o) -- toggled from LabRail on the right edge.
  const [labActive, setLabActive] = useState(false)

  const handleChangeTab = (nextTab: Tab) => {
    setSelectedMatchId(null)
    setLabActive(false)
    setTab(nextTab)
  }

  const handleToggleLab = () => {
    setSelectedMatchId(null)
    setLabActive((prev) => !prev)
  }

  const marketConfig = MARKET_TAB_CONFIG[tab]

  return (
    <div className="app-shell flex h-screen w-full text-zinc-200">
      <Sidebar active={labActive ? null : tab} onChange={handleChangeTab} />
      {/* The list page (Lab/MarketPage/Teams/ComingSoon) stays mounted at
       * all times -- MatchDetailView renders as an absolutely-positioned
       * overlay ON TOP of it instead of replacing it via ternary. Only
       * mounting one or the other used to destroy and recreate the list
       * page every time a card was opened and closed, resetting its
       * scroll position, league/search filters, and forcing a refetch --
       * "back" landed you somewhere else, not where you were. Keeping the
       * list mounted underneath means closing the overlay reveals it
       * completely unchanged. */}
      <div className="relative flex flex-1 overflow-hidden">
        {labActive ? (
          <LabPage onOpenMatch={setSelectedMatchId} />
        ) : marketConfig ? (
          <MarketPage
            market={marketConfig.market}
            title={TAB_TITLES[tab]}
            description={marketConfig.description}
            icon={marketConfig.icon}
            isForecast
            onOpenMatch={setSelectedMatchId}
          />
        ) : tab === 'teams' ? (
          <TeamsPage />
        ) : (
          <ComingSoonPage title={TAB_TITLES[tab]} />
        )}
        {selectedMatchId !== null && (
          <div className="absolute inset-0 z-10 bg-[#08090b]">
            <MatchDetailView matchId={selectedMatchId} onBack={() => setSelectedMatchId(null)} />
          </div>
        )}
      </div>
      <LabRail active={labActive} onToggle={handleToggleLab} />
    </div>
  )
}

export default App
