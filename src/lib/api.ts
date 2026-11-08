import type {
  LivePerformance,
  MatchDetail,
  Prediction,
  Standing,
  StrategyBacktest,
  SystemStatus,
  TriggerUpdateResponse,
} from '../types'

export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export class ApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE_URL}${path}`, init)
  } catch {
    throw new ApiError(
      `Can't reach the API at ${API_BASE_URL}. Is uvicorn running?`,
    )
  }
  if (!res.ok) {
    throw new ApiError(`Request failed (${res.status})`, res.status)
  }
  return res.json() as Promise<T>
}

export function fetchPredictions(options?: {
  modelVersion?: string
  isForecast?: boolean
  limit?: number
}): Promise<Prediction[]> {
  const params = new URLSearchParams()
  if (options?.modelVersion) params.set('model_version', options.modelVersion)
  if (options?.isForecast !== undefined) params.set('is_forecast', String(options.isForecast))
  params.set('limit', String(options?.limit ?? 100))
  return request<Prediction[]>(`/predictions?${params.toString()}`)
}

export function fetchStandings(league: string, season?: number): Promise<Standing[]> {
  const params = new URLSearchParams({ league })
  if (season !== undefined) params.set('season', String(season))
  return request<Standing[]>(`/teams/standings?${params.toString()}`)
}

export function fetchLivePerformance(): Promise<LivePerformance> {
  return request<LivePerformance>('/predictions/live-performance')
}

export function fetchMatch(matchId: number): Promise<MatchDetail> {
  return request<MatchDetail>(`/matches/${matchId}`)
}

export function fetchMatchPredictions(matchId: number): Promise<Prediction[]> {
  return request<Prediction[]>(`/matches/${matchId}/predictions`)
}

export function pingApi(): Promise<unknown> {
  return request('/')
}

export function fetchSystemStatus(): Promise<SystemStatus> {
  return request<SystemStatus>('/system/status')
}

export function triggerUpdate(): Promise<TriggerUpdateResponse> {
  return request<TriggerUpdateResponse>('/system/trigger-update', { method: 'POST' })
}

export function fetchStrategyBacktests(market: string = 'money_line'): Promise<StrategyBacktest[]> {
  const params = new URLSearchParams({ market })
  return request<StrategyBacktest[]>(`/strategy/backtests?${params.toString()}`)
}
