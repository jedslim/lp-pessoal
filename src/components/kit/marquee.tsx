import type { CSSProperties, ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Faixa infinita em CSS: duas cópias lado a lado andando meia largura.
 * Pausa no hover e para com reduced motion.
 */
export function Marquee({
  children,
  duration = 40,
  reverse = false,
  className,
  trackClassName,
}: {
  children: ReactNode
  /** Segundos para uma volta. */
  duration?: number
  reverse?: boolean
  className?: string
  trackClassName?: string
}) {
  return (
    <div className={cn("group/marquee fade-x flex overflow-hidden", className)}>
      <div
        className="animate-marquee flex w-max shrink-0 group-hover/marquee:[animation-play-state:paused] motion-reduce:animate-none"
        style={
          {
            animationDuration: `${duration}s`,
            animationDirection: reverse ? "reverse" : "normal",
          } as CSSProperties
        }
      >
        <div className={cn("flex shrink-0 items-center", trackClassName)}>
          {children}
        </div>
        <div
          aria-hidden
          className={cn("flex shrink-0 items-center", trackClassName)}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
