"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const ZONE = "America/Sao_Paulo"

/** Hora atual em Brasília. Só no cliente: o servidor mostra "--:--". */
export function LiveClock({
  className,
  zoneLabel = "BRT",
}: {
  className?: string
  /** Prefixo do fuso; `null` esconde. */
  zoneLabel?: string | null
}) {
  const [time, setTime] = useState<{ h: string; m: string } | null>(null)

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: ZONE,
    })
    const tick = () => {
      const parts = fmt.formatToParts(new Date())
      const get = (type: string) =>
        parts.find((p) => p.type === type)?.value ?? "--"
      setTime({ h: get("hour"), m: get("minute") })
    }
    tick()
    const id = setInterval(tick, 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <span className={cn("tabular-nums", className)}>
      {zoneLabel && <span className="opacity-60">{zoneLabel} </span>}
      <time dateTime={time ? `${time.h}:${time.m}` : undefined}>
        {time?.h ?? "--"}
        {/* Dois-pontos piscando, como relógio de mesa */}
        <span className="motion-safe:animate-blink">
          :
        </span>
        {time?.m ?? "--"}
      </time>
    </span>
  )
}
