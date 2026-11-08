import { HugeiconsIcon } from '@hugeicons/react'
import { ConstructionIcon } from '@hugeicons/core-free-icons'

export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
      <HugeiconsIcon icon={ConstructionIcon} size={28} strokeWidth={1.5} className="text-zinc-600" />
      <div className="text-[11px] font-medium text-zinc-300">{title} — coming soon</div>
      <p className="max-w-xs text-[10px] leading-relaxed text-zinc-500">
        This tab isn't wired up to the API yet.
      </p>
    </div>
  )
}
