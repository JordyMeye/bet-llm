import { HugeiconsIcon } from '@hugeicons/react'
import { TestTube01Icon } from '@hugeicons/core-free-icons'

/**
 * Deliberately NOT part of the left Sidebar/Football nav -- the Lab is a
 * different context, not another market (PROJECT.md 6o): the four left
 * tabs are the live product (forecasts on real upcoming fixtures), the
 * Lab is where the walk-forward-VALIDATED backtest predictions on
 * already-decided matches live instead, for anyone who wants to check
 * the model's track record.
 *
 * A small fixed floating button, not a full-height rail -- doesn't
 * occupy any layout space (fixed positioning, out of the flex row
 * entirely), so it stops competing with the page for width on every
 * view. Still opposite the left Sidebar, still visually a different
 * place, just no longer a persistent column down the whole page.
 */
export function LabRail({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title="Lab -- walk-forward-validated backtest predictions on already-decided matches"
      className={`fixed right-4 top-4 z-20 flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-lg backdrop-blur transition-all ${
        active
          ? 'border-accent-500/40 bg-accent-500/15 text-accent-300 shadow-[0_0_16px_-6px_var(--color-accent-500)]'
          : 'border-white/10 bg-[#0b0c10]/90 text-zinc-400 hover:border-white/20 hover:text-zinc-200'
      }`}
    >
      <HugeiconsIcon icon={TestTube01Icon} size={13} strokeWidth={1.5} className={active ? 'text-accent-400' : ''} />
      Lab
    </button>
  )
}
