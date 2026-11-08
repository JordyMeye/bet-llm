import { formatPct } from '../lib/format'

export function ProbabilityBar({
  home,
  draw,
  away,
}: {
  home: number
  draw: number
  away: number
}) {
  return (
    <div className="w-full min-w-[140px]">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-white/5 shadow-[inset_0_1px_2px_rgba(0,0,0,0.5)]">
        <div className="h-full bg-gradient-to-r from-accent-400 to-accent-600" style={{ width: `${home * 100}%` }} />
        <div className="h-full bg-gradient-to-r from-zinc-500 to-zinc-600" style={{ width: `${draw * 100}%` }} />
        <div className="h-full bg-gradient-to-r from-sky-400 to-sky-600" style={{ width: `${away * 100}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[9px] text-zinc-500">
        <span className="text-accent-400">H {formatPct(home)}</span>
        <span>D {formatPct(draw)}</span>
        <span className="text-sky-400">A {formatPct(away)}</span>
      </div>
    </div>
  )
}
