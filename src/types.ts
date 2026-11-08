// One row of a real league table (PROJECT.md section 6p) -- sourced
// from ESPN's standings API, not a model prediction.
export interface Standing {
  team_id: number
  name: string
  espn_team_id: number | null
  logo_url: string | null
  season: number
  rank: number | null
  zone_description: string | null
  games_played: number | null
  wins: number | null
  draws: number | null
  losses: number | null
  goals_for: number | null
  goals_against: number | null
  goal_difference: number | null
  points: number | null
  points_per_game: number | null
  fetched_at: string
}

// The live forecast track record (PROJECT.md section 6q) -- real
// accuracy/Brier/log-loss on forecasts made ahead of time then graded
// once played. Separate from and more credible than backtest numbers.
export interface MoneyLinePerformance {
  n: number
  accuracy: number | null
  brier: number | null
  log_loss: number | null
}

export interface MarketPerformance {
  n: number
  accuracy: number | null
  brier: number | null
}

// PROJECT.md section 6s. edge_vs_closing_market ("Option A") is NOT true
// CLV -- computable retroactively on every graded forecast once closing
// odds exist. true_clv ("Option B") is real CLV but forward-only, only
// for forecasts that captured real odds at generation time.
export interface OddsSignal {
  n: number
  mean_pct: number | null
}

export interface LivePerformance {
  n: number
  since_date: string | null
  last_graded_at: string | null
  money_line: MoneyLinePerformance
  markets: Record<string, MarketPerformance>
  edge_vs_closing_market: OddsSignal
  true_clv: OddsSignal
}

// The self-updating pipeline's state (PROJECT.md section 6t) -- what
// drives the "Update now" button's in-progress state and the data
// freshness indicator.
export interface SystemStatus {
  last_successful_at: string | null
  is_stale: boolean
  is_running: boolean
  last_run_status: string | null
  last_run_summary: string | null
}

export interface TriggerUpdateResponse {
  started: boolean
  message: string
}

// One configuration from the Strategy Lab edge-threshold sweep (PROJECT.md
// section 6v) -- computed offline against the walk-forward backtest set,
// never live bet advice. fold_breakdown is the one to check before
// trusting any aggregate roi_pct: a real edge should hold up across
// folds, not be carried by a single one.
export interface StrategyFoldStat {
  bets: number
  win_rate_pct: number | null
  roi_pct: number | null
}

export interface StrategyBacktest {
  id: number
  market: string
  model_version: string
  staking_method: 'flat' | 'kelly'
  edge_threshold_pct: number
  odds_cap: number | null
  kelly_multiplier: number | null
  total_bets: number
  win_rate_pct: number | null
  roi_pct: number | null
  profit: number | null
  total_staked: number | null
  max_drawdown_pct: number | null
  final_bankroll: number | null
  avg_odds: number | null
  // Monte Carlo p-value vs. "the closing market is fair" -- low means
  // this profit would be surprising under a fair market, but it's NOT
  // proof of a real edge alone (assumes independent bets, which real
  // matches aren't) -- always read alongside fold_breakdown.
  p_value: number | null
  fold_breakdown: Record<string, StrategyFoldStat> | null
  odds_bucket_breakdown: Record<string, StrategyFoldStat> | null
  bankroll_curve: number[] | null
  run_at: string
}

export interface Prediction {
  id: number
  match_id: number
  model_version: string
  predicted_home_prob: number
  predicted_draw_prob: number
  predicted_away_prob: number
  recommended_bet: string | null
  edge: number | null
  expected_value: number | null
  entropy: number | null
  predicted_at: string
  home_team: string | null
  away_team: string | null
  match_date: string | null
  league: string | null
  home_odds: number | null
  draw_odds: number | null
  away_odds: number | null
  // Season (Lab filtering) and the real final score once known -- both
  // null for a genuinely unplayed forecast. Lets the frontend show
  // whether a decided match's money-line prediction was actually right.
  season: number | null
  home_score: number | null
  away_score: number | null
  // Real pre-match odds captured at forecast-generation time (PROJECT.md
  // 6s "Option B") -- only populated for is_forecast=true rows, and only
  // when a book had priced the match yet. See lib/markets.ts's
  // resolveDisplayOdds for how this and home/draw/away_odds combine.
  odds_at_forecast_home: number | null
  odds_at_forecast_draw: number | null
  odds_at_forecast_away: number | null
  // Real over/under-2.5 CLOSING odds (same "real odds a bettor would see"
  // as home/draw/away_odds, just for that market) and their
  // forecast-time equivalents (PROJECT.md 6-ah). BTTS has no closing-odds
  // source at all -- football-data.co.uk never carries that market -- so
  // it only ever has a forecast-time value, and only via the Sofascore
  // fallback (ESPN/DraftKings doesn't carry BTTS either). See
  // lib/markets.ts's resolveOverUnderOdds/resolveBttsOdds.
  over_2_5_odds: number | null
  under_2_5_odds: number | null
  odds_at_forecast_over_2_5: number | null
  odds_at_forecast_under_2_5: number | null
  odds_at_forecast_btts_yes: number | null
  odds_at_forecast_btts_no: number | null
  // Derived multi-market probabilities (goals engine, PROJECT.md 6e/6g) --
  // null for any model_version that only ever produced 1X2 (e.g. the
  // older classifier-only rows). Calibrated estimates, never bets.
  over_1_5_prob: number | null
  over_2_5_prob: number | null
  over_3_5_prob: number | null
  btts_yes_prob: number | null
  home_over_1_5_prob: number | null
  away_over_1_5_prob: number | null
  // PROJECT.md section 6j: false = walk-forward-VALIDATED prediction on an
  // already-decided match. true = production-trained prediction on a
  // genuinely future/unplayed fixture -- not separately re-validated
  // against a holdout. Always trust this over parsing model_version.
  is_forecast: boolean
  // true = this forecast's Elo inputs were imputed (a team had no rating
  // at all -- neutral elo_diff=0/elo_win_prob=0.5 substituted). A real
  // lower-confidence signal; only meaningful when is_forecast is true.
  elo_imputed: boolean
}

/**
 * Full match feature row from GET /matches/{id}. The backend deliberately
 * returns `SELECT *` behind a Pydantic `extra: allow` passthrough (see
 * Controllers/schemas.py's MatchDetail docstring) instead of pinning every
 * one of the ~150 feature columns -- the feature set evolves as the model
 * does. Mirrored here the same way: known fields the context panel reads
 * are typed explicitly, everything else passes through via the index
 * signature rather than needing this file updated on every new feature.
 */
export interface MatchDetail {
  id: number
  game: string
  league: string
  season: number
  match_date: string
  home_team: string
  away_team: string
  home_score: number | null
  away_score: number | null
  referee: string | null
  money_line_target: number | null
  home_odds: number | null
  draw_odds: number | null
  away_odds: number | null

  // Standings / strength
  home_elo: number | null
  away_elo: number | null
  elo_diff: number | null
  elo_win_prob: number | null
  home_ppg: number | null
  away_ppg: number | null
  home_rank: number | null
  away_rank: number | null
  home_points_above_relegation: number | null
  away_points_above_relegation: number | null
  games_remaining: number | null

  // Attack & defense (per-game tendency, leak-free rolling)
  home_team_avg_goals_for: number | null
  home_team_avg_goals_against: number | null
  away_team_avg_goals_for: number | null
  away_team_avg_goals_against: number | null
  home_team_avg_shots_for: number | null
  home_team_avg_shots_against: number | null
  away_team_avg_shots_for: number | null
  away_team_avg_shots_against: number | null
  home_team_avg_shots_on_target_for: number | null
  home_team_avg_shots_on_target_against: number | null
  away_team_avg_shots_on_target_for: number | null
  away_team_avg_shots_on_target_against: number | null
  home_team_avg_xg_for: number | null
  home_team_avg_xg_against: number | null
  away_team_avg_xg_for: number | null
  away_team_avg_xg_against: number | null

  // Discipline
  home_team_avg_fouls: number | null
  home_team_avg_cards: number | null
  away_team_avg_fouls: number | null
  away_team_avg_cards: number | null
  referee_avg_cards: number | null
  referee_avg_fouls: number | null
  referee_matches_officiated: number | null

  // Form (recent form, blended)
  home_team_form_wins: number | null
  home_team_form_draws: number | null
  home_team_form_losses: number | null
  away_team_form_wins: number | null
  away_team_form_draws: number | null
  away_team_form_losses: number | null

  // Head-to-head
  h2h_home_wins: number | null
  h2h_draws: number | null
  h2h_away_wins: number | null
  h2h_matches: number | null

  // Squad dependence (Family A)
  home_squad_dependence: number | null
  away_squad_dependence: number | null
  home_top_scorer_share: number | null
  away_top_scorer_share: number | null

  // Fixture congestion (Family B)
  home_rest_days: number | null
  away_rest_days: number | null
  home_matches_last_7d: number | null
  away_matches_last_7d: number | null
  home_matches_last_14d: number | null
  away_matches_last_14d: number | null
  home_short_rest_flag: number | null
  away_short_rest_flag: number | null
  home_days_to_next_match: number | null
  away_days_to_next_match: number | null
  is_midweek: number | null
  away_travel_km: number | null

  // Match importance / stakes (Family C)
  home_title_race_pressure: number | null
  away_title_race_pressure: number | null
  home_europe_race_pressure: number | null
  away_europe_race_pressure: number | null
  home_relegation_pressure: number | null
  away_relegation_pressure: number | null
  home_stakes_index: number | null
  away_stakes_index: number | null
  stakes_asymmetry: number | null
  home_dead_rubber: number | null
  away_dead_rubber: number | null

  // Narrative (Family D)
  is_derby: number | null
  home_recent_heavy_defeat: number | null
  away_recent_heavy_defeat: number | null

  // Everything else the API returns that this panel doesn't specifically
  // curate (xG/shots tendencies, weather, extended odds markets, ...).
  [key: string]: unknown
}
