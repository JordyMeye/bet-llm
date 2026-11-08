import { useEffect, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import { CloudSyncIcon, ReloadIcon } from '@hugeicons/core-free-icons'
import { fetchSystemStatus, triggerUpdate } from '../lib/api'
import type { SystemStatus } from '../types'
import { formatRelativeTime } from '../lib/format'

const NORMAL_POLL_MS = 30_000
const RUNNING_POLL_MS = 10_000

/**
 * The self-updating pipeline's status + manual trigger (PROJECT.md
 * section 6t) -- lives in the Sidebar footer, next to the existing API
 * health indicator, since both are "is the system okay" signals. Polls
 * GET /system/status (cheap, no work done serving it) -- faster while
 * an update is actually running, so completion shows up promptly
 * without the user needing to refresh anything. The button disables
 * itself the instant an update is known to be running (from either this
 * click or a scheduled/startup-triggered one elsewhere) so it can't be
 * mashed into double-firing -- the backend's own concurrency guard would
 * refuse a second one anyway, but the UI shouldn't invite trying.
 */
export function SystemStatusWidget() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [triggerMessage, setTriggerMessage] = useState<string | null>(null)

  const load = () => {
    fetchSystemStatus()
      .then(setStatus)
      .catch(() => {
        // Non-critical -- the rest of the app works without this widget.
      })
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, status?.is_running ? RUNNING_POLL_MS : NORMAL_POLL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.is_running])

  const handleTrigger = () => {
    setTriggering(true)
    setTriggerMessage(null)
    triggerUpdate()
      .then((res) => {
        setTriggerMessage(res.message)
        load()
      })
      .catch(() => setTriggerMessage("Couldn't start the update."))
      .finally(() => setTriggering(false))
  }

  if (!status) return null

  const isRunning = status.is_running
  const buttonDisabled = triggering || isRunning
  // Real gap found live (PROJECT.md changelog): the API has always
  // returned last_run_status/last_run_summary, but this widget never
  // read them -- a failed run (e.g. "8/9 step(s) succeeded. Failed:
  // refresh_data.py.") looked identical to a merely-stale one, so there
  // was no way to tell from the portal whether the last attempt actually
  // failed or just hadn't run recently. Only meaningful once a run has
  // actually finished -- irrelevant while one is currently in progress.
  const lastRunFailed = !isRunning && status.last_run_status === 'failed'

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-white/10 bg-gradient-to-b from-white/[0.03] to-white/[0.01] px-2.5 py-2 text-[10px] text-zinc-500">
      <div className="flex items-center gap-2">
        <HugeiconsIcon
          icon={CloudSyncIcon}
          size={12}
          strokeWidth={1.5}
          className={
            isRunning
              ? 'animate-spin text-accent-400'
              : lastRunFailed
                ? 'text-rose-400'
                : status.is_stale
                  ? 'text-amber-400'
                  : 'text-accent-400'
          }
        />
        <span className="flex-1">
          {isRunning
            ? 'Updating data…'
            : lastRunFailed
              ? 'Last update failed'
              : status.last_successful_at
                ? `Updated ${formatRelativeTime(status.last_successful_at)}`
                : 'Never updated yet'}
        </span>
      </div>

      {isRunning && <span className="text-[9px] text-zinc-600">Usually takes 15-25 minutes</span>}

      {lastRunFailed && status.last_run_summary && (
        <span className="text-[9px] leading-relaxed text-rose-300/80">{status.last_run_summary}</span>
      )}
      {lastRunFailed && status.last_successful_at && (
        <span className="text-[9px] text-zinc-600">
          Data is current as of the last success: {formatRelativeTime(status.last_successful_at)}
        </span>
      )}

      <button
        type="button"
        onClick={handleTrigger}
        disabled={buttonDisabled}
        className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
          buttonDisabled
            ? 'cursor-not-allowed border-white/5 text-zinc-600'
            : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]'
        }`}
      >
        <HugeiconsIcon icon={ReloadIcon} size={11} strokeWidth={1.5} className={isRunning ? 'animate-spin' : ''} />
        {isRunning ? 'Update running…' : 'Update now'}
      </button>

      {triggerMessage && <span className="text-[9px] leading-relaxed text-zinc-600">{triggerMessage}</span>}
    </div>
  )
}
