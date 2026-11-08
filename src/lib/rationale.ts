import type { MatchDetail, Prediction } from '../types'

export type SignalSide = 'home' | 'away' | 'neutral'

export interface Signal {
  key: string
  /** Human label, e.g. "Elo rating". */
  label: string
  homeValue: number | null
  awayValue: number | null
  /** Which side this ONE signal points toward, on its own -- 'neutral'
   * when either side is missing data, or the two values are close enough
   * (within the signal's own noise margin) that calling a direction would
   * overstate a real difference. */
  favors: SignalSide
  format: (v: number) => string
}

const closeEnough = (a: number, b: number, margin: number) => Math.abs(a - b) <= margin

function compare(home: number | null, away: number | null, margin: number): SignalSide {
  if (home === null || away === null) return 'neutral'
  if (closeEnough(home, away, margin)) return 'neutral'
  return home > away ? 'home' : 'away'
}

/**
 * The real, already-computed feature values behind a moneyline pick,
 * turned into a legible "which way does each real signal point" list --
 * directly answers "why is the model favoring this side," using nothing
 * but data already on the match record. Deliberately NOT a generated
 * paragraph: every line here is a real number pulled straight off
 * `match`, verifiable against the raw stats sections on the same page,
 * not a claim invented on top of them.
 *
 * Each signal's margin is the point below which the gap isn't considered
 * meaningful for that specific metric (chosen from the metric's own
 * typical scale, not a single global threshold) -- e.g. a 20-point Elo
 * gap is noise, a 250-point gap isn't; a 0.3 PPG gap is noise over a
 * couple of games, a 1.5 gap isn't.
 */
export function buildSignalScorecard(match: MatchDetail): Signal[] {
  const signals: Signal[] = [
    {
      key: 'elo',
      label: 'Elo rating',
      homeValue: match.home_elo,
      awayValue: match.away_elo,
      favors: compare(match.home_elo, match.away_elo, 60),
      format: (v) => v.toFixed(0),
    },
    {
      key: 'ppg',
      label: 'Points per game (this season)',
      homeValue: match.home_ppg,
      awayValue: match.away_ppg,
      favors: compare(match.home_ppg, match.away_ppg, 0.35),
      format: (v) => v.toFixed(2),
    },
    {
      key: 'form',
      label: 'Recent form',
      homeValue: formRate(match.home_team_form_wins, match.home_team_form_draws, match.home_team_form_losses),
      awayValue: formRate(match.away_team_form_wins, match.away_team_form_draws, match.away_team_form_losses),
      favors: compare(
        formRate(match.home_team_form_wins, match.home_team_form_draws, match.home_team_form_losses),
        formRate(match.away_team_form_wins, match.away_team_form_draws, match.away_team_form_losses),
        0.15,
      ),
      format: (v) => `${Math.round(v * 100)}% pts`,
    },
    {
      key: 'goal_diff',
      label: 'Goal difference (per game, rolling)',
      homeValue: goalDiff(match.home_team_avg_goals_for, match.home_team_avg_goals_against),
      awayValue: goalDiff(match.away_team_avg_goals_for, match.away_team_avg_goals_against),
      favors: compare(
        goalDiff(match.home_team_avg_goals_for, match.home_team_avg_goals_against),
        goalDiff(match.away_team_avg_goals_for, match.away_team_avg_goals_against),
        0.3,
      ),
      format: (v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)),
    },
    {
      key: 'xg_diff',
      label: 'Expected goal difference (xG, rolling)',
      homeValue: goalDiff(match.home_team_avg_xg_for, match.home_team_avg_xg_against),
      awayValue: goalDiff(match.away_team_avg_xg_for, match.away_team_avg_xg_against),
      favors: compare(
        goalDiff(match.home_team_avg_xg_for, match.home_team_avg_xg_against),
        goalDiff(match.away_team_avg_xg_for, match.away_team_avg_xg_against),
        0.3,
      ),
      format: (v) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)),
    },
    {
      key: 'h2h',
      label: 'Head-to-head record',
      homeValue: match.h2h_matches && match.h2h_matches > 0 ? match.h2h_home_wins : null,
      awayValue: match.h2h_matches && match.h2h_matches > 0 ? match.h2h_away_wins : null,
      favors:
        match.h2h_matches && match.h2h_matches > 0
          ? compare(match.h2h_home_wins, match.h2h_away_wins, 0.5)
          : 'neutral',
      format: (v) => `${v} win${v === 1 ? '' : 's'}`,
    },
  ]
  return signals
}

function formRate(wins: number | null, draws: number | null, losses: number | null): number | null {
  if (wins === null || draws === null || losses === null) return null
  const games = wins + draws + losses
  if (games === 0) return null
  return (wins * 3 + draws) / (games * 3)
}

function goalDiff(forAvg: number | null, againstAvg: number | null): number | null {
  if (forAvg === null || againstAvg === null) return null
  return forAvg - againstAvg
}

export interface Rationale {
  /** The moneyline side the model actually favors -- may be 'draw', which
   * these home-vs-away comparative signals can't directly corroborate. */
  favoredSide: 'home' | 'draw' | 'away'
  favoredProb: number
  signals: Signal[]
  /** Signals with a real (non-neutral) direction, i.e. excluding ones
   * with insufficient data or too small a gap to call. */
  determinateSignals: Signal[]
  /** How many determinate signals point the same way as the model's pick
   * -- only meaningful when favoredSide isn't 'draw'. */
  agreeingCount: number
}

export function buildRationale(match: MatchDetail, prediction: Prediction): Rationale {
  const probs: Record<'home' | 'draw' | 'away', number> = {
    home: prediction.predicted_home_prob,
    draw: prediction.predicted_draw_prob,
    away: prediction.predicted_away_prob,
  }
  const favoredSide = (Object.keys(probs) as Array<'home' | 'draw' | 'away'>).reduce((a, b) =>
    probs[a] >= probs[b] ? a : b,
  )
  const signals = buildSignalScorecard(match)
  const determinateSignals = signals.filter((s) => s.favors !== 'neutral')
  const agreeingCount =
    favoredSide === 'draw' ? 0 : determinateSignals.filter((s) => s.favors === favoredSide).length

  return {
    favoredSide,
    favoredProb: probs[favoredSide],
    signals,
    determinateSignals,
    agreeingCount,
  }
}
