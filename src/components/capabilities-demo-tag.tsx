import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Selo discreto "demo" dos playgrounds das Capacidades: deixa claro que é uma
 * demonstração (dados de exemplo), sem gritar.
 */
export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "text-muted-foreground inline-flex h-[18px] shrink-0 items-center rounded-[4px] border border-white/20 px-1.5 font-mono text-[10px] leading-none font-normal tracking-[0.16em] uppercase",
        className,
      )}
    >
      demo
    </span>
  )
}

/**
 * Barra do topo de cada playground: o que fazer ali (uma frase, legível) e o
 * selo de demo. À direita, controles próprios do playground (`end`).
 */
export function PlaygroundBar({
  icon,
  hint,
  end,
  className,
}: {
  icon: ReactNode
  hint: ReactNode
  end?: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex min-h-12 shrink-0 items-center gap-3 border-b border-white/[0.07] px-4 py-2 sm:px-5",
        className,
      )}
    >
      <span
        aria-hidden
        className="text-red-light flex size-7 shrink-0 items-center justify-center rounded-full bg-red-light/10 [&_svg]:size-3.5"
      >
        {icon}
      </span>
      <p className="text-foreground/90 min-w-0 flex-1 text-[13px] leading-snug text-pretty sm:text-sm">
        {hint}
      </p>
      <span className="flex shrink-0 items-center gap-2">
        {end}
        <DemoTag />
      </span>
    </div>
  )
}
