import { cn } from "@/lib/utils"

/** Bolinha verde pulsando: "disponível". */
export function StatusDot({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex size-2", className)}>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60 motion-reduce:animate-none" />
      <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
    </span>
  )
}
