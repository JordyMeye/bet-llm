import type { Prediction } from '../types'

/**
 * The four markets a match card / analysis view can show, and which
 * engine actually produced each one -- a fact fixed by how the backend
 * builds every prediction row (PROJECT.md sections 6d/6g/6j): the money
 * line comes from whichever model this row's model_version names, but
 * every other market is ALWAYS the goals engine's own scoreline matrix,
 * regardless of which row it's attached to. This lets the UI show
 * "which model produced what I'm looking at" as a simple derived label
 * instead of a control the user has to operate -- no dropdown, no
 * separate fetch per market.
 */
export const MARKET_TABS = [
  { id: 'moneyline', label: '1X2' },
  { id: 'double_chance', label: 'Double Chance' },
  { id: 'over_under', label: 'O/U' },
  { id: 'btts', label: 'BTTS' },
  { id: 'team_totals', label: 'Totals' },
] as const

export type MarketId = (typeof MARKET_TABS)[number]['id']

export function marketModelLabel(prediction: Prediction, market: MarketId): string {
  if (market === 'moneyline' || market === 'double_chance') return prediction.model_version
  return 'Goals engine (Dixon-Coles)'
}

/** Whether this row has any data at all for the given market -- used to
 * grey out/skip a tab rather than switch to it and show nothing. */
export function marketHasData(prediction: Prediction, market: MarketId): boolean {
  switch (market) {
    case 'moneyline':
    case 'double_chance':
      // Double chance is a pure derivation of the money line's own
      // three outcomes (see doubleChanceProbs) -- never missing
      // whenever the money line itself isn't.
      return true
    case 'over_under':
      return prediction.over_1_5_prob !== null || prediction.over_2_5_prob !== null || prediction.over_3_5_prob !== null
    case 'btts':
      return prediction.btts_yes_prob !== null
    case 'team_totals':
      return prediction.home_over_1_5_prob !== null || prediction.away_over_1_5_prob !== null
  }
}

/** Double chance (1X / X2 / 12) is not a separate prediction -- it's a
 * pure sum of the money line's own three mutually-exclusive outcomes:
 * P(1X) = P(home) + P(draw), P(X2) = P(draw) + P(away),
 * P(12) = P(home) + P(away). No new model, no new training, no
 * calibration to tune -- it's exactly as reliable (or not) as the money
 * line probabilities it's built from, which this project has already
 * calibration-tested extensively. Also computes the equivalent
 * de-vigged MARKET double-chance probabilities the same way, when
 * odds are available, so the card can show a market comparison too. */
export function doubleChanceProbs(prediction: Prediction): {
  oneX: number
  x2: number
  onetwo: number
} {
  const p = prediction
  return {
    oneX: p.predicted_home_prob + p.predicted_draw_prob,
    x2: p.predicted_draw_prob + p.predicted_away_prob,
    onetwo: p.predicted_home_prob + p.predicted_away_prob,
  }
}

// Preference order, most-trusted first. "blend_v1" is the validated
// backtest blend (only exists for already-decided matches). A genuinely
// future/unplayed fixture only ever has forecast predictions --
// "blend_no_market_forecast_v1" (PROJECT.md 6j) is the best of those.
// Falls through to whatever's there (e.g. goals_engine_v1 alone, or an
// older classifier-only version) rather than showing nothing.
export const MODEL_VERSION_PREFERENCE = ['blend_v1', 'blend_no_market_forecast_v1', 'goals_engine_v1']

/**
 * A market-scoped list (Money Line / Over-Under / BTTS / Team Totals nav
 * pages) fetches ALL predictions for a set of matches, unfiltered by
 * model_version -- a match can carry more than one row (e.g. both
 * goals_engine_v1 and blend_v1 rows for the same match_id). Collapse that
 * down to one card per match by picking the single best-available row per
 * match_id via MODEL_VERSION_PREFERENCE, same resolution MatchDetailView
 * uses for its primary prediction, so the list and the detail view never
 * disagree about which row is "the" prediction for a match.
 */
export interface DisplayOdds {
  home: number | null
  draw: number | null
  away: number | null
  /** 'closing' = matches.home/draw/away_odds, the MatchHistory closing
   * price (only exists once a match has been played). 'forecast_time' =
   * predictions.odds_at_forecast_* -- a real price, but captured at
   * forecast-generation time, not necessarily current and not a closing
   * price -- kept visually distinct so the two are never confused with
   * each other (PROJECT.md 6s: mixing odds sources invisibly is exactly
   * the class of bug this project has been burned by before). null = no
   * real odds available at all yet for this row. */
  source: 'closing' | 'forecast_time' | null
}

/** Picks the best real odds to display for a prediction row -- closing
 * price when it exists (every backtest/already-played row), falling
 * back to the real pre-match price captured at forecast time (only some
 * forecast rows have this -- a book has to have priced the match yet).
 * Never fabricates a number; a row with neither stays null/source=null. */
export function resolveDisplayOdds(prediction: Prediction): DisplayOdds {
  const p = prediction
  if (p.home_odds !== null && p.draw_odds !== null && p.away_odds !== null) {
    return { home: p.home_odds, draw: p.draw_odds, away: p.away_odds, source: 'closing' }
  }
  if (p.odds_at_forecast_home !== null && p.odds_at_forecast_draw !== null && p.odds_at_forecast_away !== null) {
    return { home: p.odds_at_forecast_home, draw: p.odds_at_forecast_draw, away: p.odds_at_forecast_away, source: 'forecast_time' }
  }
  return { home: null, draw: null, away: null, source: null }
}

/** Same shape as DisplayOdds, for a 2-outcome market (over/under,
 * BTTS yes/no) instead of 3-outcome money line. */
export interface TwoWayOdds {
  yes: number | null
  no: number | null
  source: 'closing' | 'forecast_time' | null
}

/** Real over/under-2.5 odds for a prediction row -- closing price
 * (matches.over_2_5_odds/under_2_5_odds) when it exists, falling back to
 * the forecast-time capture (predictions.odds_at_forecast_over_2_5/
 * under_2_5 -- ESPN/DraftKings carries this in the same call already
 * made for the money line). "yes" here means "over," "no" means "under"
 * -- named to match TwoWayOdds/MarketBar's generic yes/no shape. */
export function resolveOverUnderOdds(prediction: Prediction): TwoWayOdds {
  const p = prediction
  if (p.over_2_5_odds !== null && p.under_2_5_odds !== null) {
    return { yes: p.over_2_5_odds, no: p.under_2_5_odds, source: 'closing' }
  }
  if (p.odds_at_forecast_over_2_5 !== null && p.odds_at_forecast_under_2_5 !== null) {
    return { yes: p.odds_at_forecast_over_2_5, no: p.odds_at_forecast_under_2_5, source: 'forecast_time' }
  }
  return { yes: null, no: null, source: null }
}

/** Real BTTS odds -- forecast-time only, ALWAYS. Unlike every other
 * market here, there is no closing-odds source at all: football-data.co.uk's
 * MatchHistory (this project's only backtest odds source) never carries
 * BTTS, so even an already-decided backtest row can never have a real
 * BTTS price -- only a forecast made while Sofascore had it priced ahead
 * of kickoff (ESPN/DraftKings doesn't carry BTTS either, so Sofascore is
 * the only possible source, not just the fallback it is for other markets). */
export function resolveBttsOdds(prediction: Prediction): TwoWayOdds {
  const p = prediction
  if (p.odds_at_forecast_btts_yes !== null && p.odds_at_forecast_btts_no !== null) {
    return { yes: p.odds_at_forecast_btts_yes, no: p.odds_at_forecast_btts_no, source: 'forecast_time' }
  }
  return { yes: null, no: null, source: null }
}

export interface DoubleChanceOdds {
  /** Each is ONE number -- the odds for that specific double-chance bet
   * (e.g. "1X happens"), not a yes/no pair. Double chance isn't a single
   * binary bet the way BTTS or Over/Under is; 1X, 12, and X2 are three
   * separate, independently-priced bets that happen to be shown
   * together, so each only ever gets its own single price (PROJECT.md
   * changelog -- a two-sided display here read as if the "other side"
   * were part of the same bet, which it isn't). */
  oneX: number | null
  x2: number | null
  onetwo: number | null
  /** Double chance has no real stored odds anywhere in this project --
   * these are always DERIVED from whichever real money-line odds
   * resolveDisplayOdds finds (de-vigged, then re-priced for the combined
   * outcome), never a directly quotable market price. This says which
   * money-line odds the derivation used, not "real double-chance odds
   * source" -- the UI must label these as estimated, not quoted. */
  baseSource: 'closing' | 'forecast_time' | null
}

/** Derives double-chance decimal odds from the real money-line odds
 * already available for this row -- de-vig the three real prices into
 * fair probabilities (same approach matches.market_home_prob etc. use),
 * sum the two relevant outcomes, then invert back to odds. This is an
 * ESTIMATE, not a real bookmaker double-chance price (which would carry
 * its own, usually larger, margin) -- exactly as reliable as the money
 * line odds it's built from, same spirit as doubleChanceProbs above. */
export function doubleChanceOdds(prediction: Prediction): DoubleChanceOdds {
  const odds = resolveDisplayOdds(prediction)
  if (odds.home === null || odds.draw === null || odds.away === null) {
    return { oneX: null, x2: null, onetwo: null, baseSource: null }
  }
  const impliedHome = 1 / odds.home
  const impliedDraw = 1 / odds.draw
  const impliedAway = 1 / odds.away
  const overround = impliedHome + impliedDraw + impliedAway
  const fairHome = impliedHome / overround
  const fairDraw = impliedDraw / overround
  const fairAway = impliedAway / overround
  return {
    oneX: 1 / (fairHome + fairDraw),
    x2: 1 / (fairDraw + fairAway),
    onetwo: 1 / (fairHome + fairAway),
    baseSource: odds.source,
  }
}

/** The money-line probability on whichever side the model actually
 * favors -- "how confident is this pick," used for the confidence sort. */
export function predictionConfidence(prediction: Prediction): number {
  return Math.max(prediction.predicted_home_prob, prediction.predicted_draw_prob, prediction.predicted_away_prob)
}

/** Whether the money-line forecast (whichever side it favored) actually
 * matched the real result -- null while the match hasn't been played yet
 * (home_score/away_score still unknown), never guessed. Used to put a
 * plain green/red signal on a decided match's card in the Lab, so "was
 * this one right" doesn't require opening the full analysis view. */
export function moneyLineWasCorrect(prediction: Prediction): boolean | null {
  const p = prediction
  if (p.home_score === null || p.away_score === null) return null

  const actual = p.home_score > p.away_score ? 'home' : p.away_score > p.home_score ? 'away' : 'draw'
  const probs: Record<'home' | 'draw' | 'away', number> = {
    home: p.predicted_home_prob,
    draw: p.predicted_draw_prob,
    away: p.predicted_away_prob,
  }
  const favored = (Object.keys(probs) as Array<'home' | 'draw' | 'away'>).reduce((a, b) => (probs[a] >= probs[b] ? a : b))
  return favored === actual
}

/** Whether the prediction for a SPECIFIC market matched the real result
 * -- null while the match hasn't been played yet, or while this row
 * never produced that market at all. Used for the Lab's per-market
 * pass/fail badge: which market is "correct" depends on which market
 * you're actually looking at -- a 1-0 result passes money line but
 * fails BTTS, and the badge needs to reflect whichever tab is selected,
 * not always money line regardless of what's on screen. */
export function marketPredictionWasCorrect(prediction: Prediction, market: MarketId): boolean | null {
  const p = prediction
  if (p.home_score === null || p.away_score === null) return null
  const totalGoals = p.home_score + p.away_score

  switch (market) {
    case 'moneyline':
      return moneyLineWasCorrect(p)

    case 'double_chance': {
      // Grades whichever double-chance side matches the money line's
      // OWN favored side (home/draw favored -> graded as 1X, away
      // favored -> graded as X2) -- the double-chance bet this forecast
      // would actually have pointed to, not an arbitrary pick among
      // three simultaneous outcomes.
      const probs: Record<'home' | 'draw' | 'away', number> = {
        home: p.predicted_home_prob, draw: p.predicted_draw_prob, away: p.predicted_away_prob,
      }
      const favored = (Object.keys(probs) as Array<'home' | 'draw' | 'away'>).reduce((a, b) => (probs[a] >= probs[b] ? a : b))
      const actual = p.home_score > p.away_score ? 'home' : p.away_score > p.home_score ? 'away' : 'draw'
      return favored === 'away' ? actual === 'away' || actual === 'draw' : actual === 'home' || actual === 'draw'
    }

    case 'over_under':
      // The 2.5 line specifically -- the standard default line, same
      // convention the rest of this project uses when one representative
      // O/U line is needed (e.g. Analysis/common.py's ODDS_BUCKETS work).
      if (p.over_2_5_prob === null) return null
      return (p.over_2_5_prob >= 0.5) === (totalGoals > 2.5)

    case 'btts':
      if (p.btts_yes_prob === null) return null
      return (p.btts_yes_prob >= 0.5) === (p.home_score >= 1 && p.away_score >= 1)

    case 'team_totals': {
      // Two independent sub-bets (home team over 1.5, away team over
      // 1.5) -- graded as a pass only if BOTH are correct, same as how
      // the card displays them as a pair, not a single number.
      if (p.home_over_1_5_prob === null || p.away_over_1_5_prob === null) return null
      const homeCorrect = (p.home_over_1_5_prob >= 0.5) === (p.home_score > 1.5)
      const awayCorrect = (p.away_over_1_5_prob >= 0.5) === (p.away_score > 1.5)
      return homeCorrect && awayCorrect
    }
  }
}

export function resolvePrimaryPredictionsByMatch(predictions: Prediction[]): Prediction[] {
  const byMatch = new Map<number, Prediction[]>()
  for (const p of predictions) {
    const existing = byMatch.get(p.match_id)
    if (existing) existing.push(p)
    else byMatch.set(p.match_id, [p])
  }
  const resolved: Prediction[] = []
  for (const rows of byMatch.values()) {
    const preferred = MODEL_VERSION_PREFERENCE.map((v) => rows.find((p) => p.model_version === v)).find(Boolean)
    resolved.push(preferred ?? rows[0])
  }
  return resolved
}
