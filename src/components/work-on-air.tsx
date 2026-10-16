"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

/**
 * O ponto final do título vira a luz de "no ar" de estúdio: vermelho, com
 * um halo pulsando. O pulso só roda com o título na tela.
 */
export function OnAirDot({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => setLive(e.isIntersecting))
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <span
      ref={ref}
      aria-hidden
      className={cn(
        "relative ml-[0.06em] inline-block size-[0.19em] translate-y-[-0.01em] rounded-full bg-red-light align-baseline shadow-[0_0_0.35em_rgb(255_52_59/0.7)]",
        className,
      )}
    >
      <span
        className={cn(
          "absolute -inset-[0.06em] rounded-full border-[0.025em] border-red-light/80 motion-safe:animate-ping",
          !live && "[animation-play-state:paused]",
        )}
      />
    </span>
  )
}
