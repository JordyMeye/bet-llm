import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'
import {
  FlameIcon,
  ShieldIcon,
  Sword01Icon,
  ChartDecreaseIcon,
  UserGroupIcon,
  Target02Icon,
  HistoryIcon,
  Cards01Icon,
} from '@hugeicons/core-free-icons'
import type { MatchDetail } from '../types'

function isTrue(value: unknown): boolean {
  return value === 1 || value === true || value === '1'
}

function fmtPct(value: unknown): string {
  if (value === null || value === undefined || typeof value !== 'number') return '—'
  return `${Math.round(value * 100)}%`
}

function fmtNum(value: unknown, digits = 1): string {
  if (value === null || value === undefined || typeof value !== 'number') return '—'
  return value.toFixed(digits)
}

function fmtDays(value: unknown): string {
  if (value === null || value === undefined || typeof value !== 'number') return '—'
  return `${value.toFixed(0)}d`
}

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'warn' }) {
  const toneClasses =
    tone === 'accent'
      ? 'border-accent-500/30 bg-accent-500/10 text-accent-300'
      : tone === 'warn'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
        : 'border-white/10 bg-white/[0.04] text-zinc-400'
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-medium ${toneClasses}`}>
      {children}
    </span>
  )
}

/** A 0-1 "pressure"/"share" value as a small horizontal fill bar. */
function MiniBar({ value }: { value: number | null }) {
  const pct = value === null ? 0 : Math.max(0, Math.min(1, value)) * 100
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/5 shadow-[inset_0_1px_1px_rgba(0,0,0,0.5)]">
      <div className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-600" style={{ width: `${pct}%` }} />
    </div>
  )
}

function CompareRow({
  label,
  home,
  away,
  format = fmtPct,
}: {
  label: string
  home: unknown
  away: unknown
  format?: (v: unknown) => string
}) {
  const homeNum = typeof home === 'number' ? home : null
  const awayNum = typeof away === 'number' ? away : null
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-[10px]">
        <span className="font-mono text-zinc-300">{format(home)}</span>
        <span className="text-zinc-500">{label}</span>
        <span className="font-mono text-zinc-300">{format(away)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex-1 scale-x-[-1]">
          <MiniBar value={homeNum} />
        </div>
        <div className="flex-1">
          <MiniBar value={awayNum} />
        </div>
      </div>
    </div>
  )
}

function Section({
  icon,
  title,
  children,
}: {
  icon: IconSvgElement
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        <HugeiconsIcon icon={icon} size={13} strokeWidth={1.5} />
        {title}
      </div>
      {children}
    </div>
  )
}

/**
 * Curated, human-readable situational context for a match -- the point
 * of the situational-intelligence layer (PROJECT.md section 5d), never
 * previously surfaced anywhere outside the model. Reads whatever the
 * backend actually returns; any field not present shows "—" rather than
 * being invented client-side.
 */
export function MatchContextPanel({ match }: { match: MatchDetail }) {
  const derby = isTrue(match.is_derby)
  const homeDeadRubber = isTrue(match.home_dead_rubber)
  const awayDeadRubber = isTrue(match.away_dead_rubber)
  const homeHeavyDefeat = isTrue(match.home_recent_heavy_defeat)
  const awayHeavyDefeat = isTrue(match.away_recent_heavy_defeat)
  const midweek = isTrue(match.is_midweek)
  const homeShortRest = isTrue(match.home_short_rest_flag)
  const awayShortRest = isTrue(match.away_short_rest_flag)

  const hasH2h = typeof match.h2h_matches === 'number' && match.h2h_matches > 0
  const hasReferee = typeof match.referee === 'string' && match.referee.length > 0

  return (
    <div className="surface flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium text-zinc-100">Match analysis</h3>
        <div className="flex flex-wrap justify-end gap-1.5">
          {derby && (
            <Badge tone="accent">
              <HugeiconsIcon icon={Sword01Icon} size={11} strokeWidth={1.5} /> Derby
            </Badge>
          )}
          {midweek && <Badge>Midweek fixture</Badge>}
          {(homeDeadRubber || awayDeadRubber) && <Badge>Dead rubber</Badge>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-x-8 gap-y-5 md:grid-cols-2">
      <Section icon={Target02Icon} title="Team strength">
        <div className="flex justify-between text-[9px] text-zinc-600">
          <span>{match.home_team}</span>
          <span>{match.away_team}</span>
        </div>
        <CompareRow label="Elo rating" home={match.home_elo} away={match.away_elo} format={(v) => fmtNum(v, 0)} />
        <CompareRow label="Points per game" home={match.home_ppg} away={match.away_ppg} format={(v) => fmtNum(v, 2)} />
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-mono text-zinc-300">{typeof match.home_rank === 'number' ? `#${match.home_rank}` : '—'}</span>
          <span className="text-zinc-500">League rank</span>
          <span className="font-mono text-zinc-300">{typeof match.away_rank === 'number' ? `#${match.away_rank}` : '—'}</span>
        </div>
        {typeof match.elo_win_prob === 'number' && (
          <p className="text-[9px] text-zinc-600">
            Elo alone (ignoring form, stakes, everything else) implies a {fmtPct(match.elo_win_prob)} win probability
            for {match.home_team}.
          </p>
        )}
      </Section>

      <Section icon={HistoryIcon} title="Head-to-head">
        {hasH2h ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[14px] font-semibold text-zinc-100">{match.h2h_home_wins ?? 0}</span>
                <span className="text-[9px] text-zinc-500">{match.home_team} wins</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[14px] font-semibold text-zinc-100">{match.h2h_draws ?? 0}</span>
                <span className="text-[9px] text-zinc-500">Draws</span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[14px] font-semibold text-zinc-100">{match.h2h_away_wins ?? 0}</span>
                <span className="text-[9px] text-zinc-500">{match.away_team} wins</span>
              </div>
            </div>
            <p className="text-[9px] text-zinc-600">Based on the last {match.h2h_matches} meetings between these two teams.</p>
          </>
        ) : (
          <p className="text-[9px] text-zinc-600">No prior meetings between these two teams in our data.</p>
        )}
      </Section>

      <Section icon={Sword01Icon} title="Attack (per game, rolling)">
        <div className="flex justify-between text-[9px] text-zinc-600">
          <span>{match.home_team}</span>
          <span>{match.away_team}</span>
        </div>
        <CompareRow label="Goals scored" home={match.home_team_avg_goals_for} away={match.away_team_avg_goals_for} format={(v) => fmtNum(v, 2)} />
        <CompareRow label="Shots" home={match.home_team_avg_shots_for} away={match.away_team_avg_shots_for} format={(v) => fmtNum(v, 1)} />
        <CompareRow
          label="Shots on target"
          home={match.home_team_avg_shots_on_target_for}
          away={match.away_team_avg_shots_on_target_for}
          format={(v) => fmtNum(v, 1)}
        />
        <CompareRow label="Expected goals (xG)" home={match.home_team_avg_xg_for} away={match.away_team_avg_xg_for} format={(v) => fmtNum(v, 2)} />
      </Section>

      <Section icon={ShieldIcon} title="Defense (conceded per game, rolling)">
        <div className="flex justify-between text-[9px] text-zinc-600">
          <span>{match.home_team}</span>
          <span>{match.away_team}</span>
        </div>
        <CompareRow label="Goals conceded" home={match.home_team_avg_goals_against} away={match.away_team_avg_goals_against} format={(v) => fmtNum(v, 2)} />
        <CompareRow label="Shots conceded" home={match.home_team_avg_shots_against} away={match.away_team_avg_shots_against} format={(v) => fmtNum(v, 1)} />
        <CompareRow
          label="Shots on target conceded"
          home={match.home_team_avg_shots_on_target_against}
          away={match.away_team_avg_shots_on_target_against}
          format={(v) => fmtNum(v, 1)}
        />
        <CompareRow
          label="Expected goals against (xG)"
          home={match.home_team_avg_xg_against}
          away={match.away_team_avg_xg_against}
          format={(v) => fmtNum(v, 2)}
        />
      </Section>

      <Section icon={Cards01Icon} title="Discipline">
        <div className="flex justify-between text-[9px] text-zinc-600">
          <span>{match.home_team}</span>
          <span>{match.away_team}</span>
        </div>
        <CompareRow label="Cards per game" home={match.home_team_avg_cards} away={match.away_team_avg_cards} format={(v) => fmtNum(v, 2)} />
        <CompareRow label="Fouls per game" home={match.home_team_avg_fouls} away={match.away_team_avg_fouls} format={(v) => fmtNum(v, 1)} />
        {hasReferee && typeof match.referee_avg_cards === 'number' && (
          <p className="text-[9px] text-zinc-600">
            Referee {match.referee} has averaged {fmtNum(match.referee_avg_cards, 2)} cards and{' '}
            {fmtNum(match.referee_avg_fouls, 1)} fouls per game
            {typeof match.referee_matches_officiated === 'number' ? ` across ${match.referee_matches_officiated} matches` : ''} on record.
          </p>
        )}
      </Section>

      <Section icon={FlameIcon} title="Stakes & importance">
        <div className="flex justify-between text-[9px] text-zinc-600">
          <span>{match.home_team}</span>
          <span>{match.away_team}</span>
        </div>
        <CompareRow label="Title race pressure" home={match.home_title_race_pressure} away={match.away_title_race_pressure} />
        <CompareRow label="European-qualification pressure" home={match.home_europe_race_pressure} away={match.away_europe_race_pressure} />
        <CompareRow label="Relegation pressure" home={match.home_relegation_pressure} away={match.away_relegation_pressure} />
        <CompareRow label="Overall stakes index" home={match.home_stakes_index} away={match.away_stakes_index} />
        {(homeDeadRubber || awayDeadRubber) && (
          <p className="text-[9px] text-zinc-600">
            {homeDeadRubber ? match.home_team : match.away_team} is mathematically safe and clear of
            the title/Europe/relegation picture for this match -- little riding on the result.
          </p>
        )}
        {match.home_stakes_index === 0 && match.away_stakes_index === 0 && !homeDeadRubber && !awayDeadRubber && (
          <p className="text-[9px] text-zinc-600">
            Reading as zero here isn't missing data -- title race, relegation, and European-qualification pressure
            are deliberately designed to only show up in a team's final ~10 games of the season. With most of the
            season still ahead, there's genuinely nothing at stake yet for either side.
          </p>
        )}
      </Section>

      <Section icon={UserGroupIcon} title="Squad dependence">
        <div className="flex justify-between text-[9px] text-zinc-600">
          <span>{match.home_team}</span>
          <span>{match.away_team}</span>
        </div>
        <CompareRow label="Goal/assist concentration" home={match.home_squad_dependence} away={match.away_squad_dependence} />
        <CompareRow label="Top scorer's share of team goals" home={match.home_top_scorer_share} away={match.away_top_scorer_share} />
        {match.home_squad_dependence === null && match.away_squad_dependence === null ? (
          <p className="text-[9px] text-zinc-600">
            Blank here isn't our data pipeline -- this needs Understat's match-level player stats for the CURRENT
            season, and Understat hasn't published those for any league yet this season (confirmed directly against
            their API). It'll start populating automatically once they do; nothing to fix on our end.
          </p>
        ) : (
          <p className="text-[9px] text-zinc-600">
            Higher = more reliant on one or two key players for goals and assists --
            a team more exposed if that player is missing or off-form.
          </p>
        )}
      </Section>

      <Section icon={ChartDecreaseIcon} title="Fixture congestion & rest">
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[10px]">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600">{match.home_team}</span>
            <span className="font-mono text-zinc-300">{fmtDays(match.home_rest_days)} rest</span>
            <span className="text-zinc-500">
              {fmtNum(match.home_matches_last_7d, 0)} matches in last 7d, {fmtNum(match.home_matches_last_14d, 0)} in last 14d
            </span>
            {homeShortRest && <Badge tone="warn">Short rest</Badge>}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600">{match.away_team}</span>
            <span className="font-mono text-zinc-300">{fmtDays(match.away_rest_days)} rest</span>
            <span className="text-zinc-500">
              {fmtNum(match.away_matches_last_7d, 0)} matches in last 7d, {fmtNum(match.away_matches_last_14d, 0)} in last 14d
            </span>
            {awayShortRest && <Badge tone="warn">Short rest</Badge>}
            {typeof match.away_travel_km === 'number' && (
              <span className="text-zinc-500">~{Math.round(match.away_travel_km)} km traveled</span>
            )}
          </div>
        </div>
      </Section>

      <Section icon={ShieldIcon} title="Recent form">
        <div className="grid grid-cols-2 gap-x-4 text-[10px]">
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600">{match.home_team}</span>
            <span className="font-mono text-zinc-300">
              {fmtNum(match.home_team_form_wins, 0)}W {fmtNum(match.home_team_form_draws, 0)}D{' '}
              {fmtNum(match.home_team_form_losses, 0)}L
            </span>
            {homeHeavyDefeat && <Badge tone="warn">Lost last match by 3+</Badge>}
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-zinc-600">{match.away_team}</span>
            <span className="font-mono text-zinc-300">
              {fmtNum(match.away_team_form_wins, 0)}W {fmtNum(match.away_team_form_draws, 0)}D{' '}
              {fmtNum(match.away_team_form_losses, 0)}L
            </span>
            {awayHeavyDefeat && <Badge tone="warn">Lost last match by 3+</Badge>}
          </div>
        </div>
      </Section>
      </div>
    </div>
  )
}
