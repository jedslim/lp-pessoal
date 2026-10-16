"use client"

import { useRef, useState, type CSSProperties } from "react"
import { cn } from "@/lib/utils"

/*
 * Números da hero: 80+ projetos, 4+ anos, 8+ segmentos.
 *
 * Grandes e leves (Archivo expandida, peso 300), em linha, com respiro e sem
 * separadores. Falam a mesma língua do nome: no hover o número ganha peso
 * (300 → 800) e o odômetro roda de novo, como se recontasse. A largura do
 * peso 800 fica reservada por um "fantasma", então nada empurra o vizinho.
 *
 * O odômetro é só CSS: cada dígito é uma fita 0–9 que rola até o valor.
 * O servidor já entrega a fita parada no número certo (sem "80 → 0 → 80"
 * na hidratação); reduced motion fica assim.
 */

/** Rótulo em duas partes: no celular quebra entre elas; do sm para cima,
 *  uma linha só. */
const stats = [
  { value: 80, label: ["projetos", "no ar"] },
  { value: 4, label: ["anos em", "produção"] },
  { value: 8, label: ["segmentos", "atendidos"] },
] as const

/** Peso em repouso e no hover (o eixo wdth fica em 125, o da display). */
const LIGHT = "[font-variation-settings:'wdth'_125,'wght'_300]"
const HEAVY = "[font-variation-settings:'wdth'_125,'wght'_800]"

export function HeroStats({ className }: { className?: string }) {
  return (
    <dl className={cn("flex gap-x-9 sm:gap-x-14 lg:gap-x-16", className)}>
      {stats.map((stat, i) => (
        <Stat key={stat.value} {...stat} index={i} />
      ))}
    </dl>
  )
}

function Stat({
  value,
  label,
  index,
}: {
  value: number
  label: readonly [string, string]
  index: number
}) {
  // Cada hover remonta o odômetro (key) e ele roda de novo; um por vez
  const [round, setRound] = useState(0)
  const last = useRef(0)
  const replay = () => {
    const now = performance.now()
    if (now - last.current < 1100) return
    last.current = now
    setRound((r) => r + 1)
  }

  return (
    <div onPointerEnter={replay} className="group/stat flex flex-col-reverse gap-3">
      <dt className="text-muted-foreground group-hover/stat:text-foreground text-[13px] leading-snug transition-colors duration-500 lg:text-sm">
        {label[0]}
        <br className="sm:hidden" /> {label[1]}
      </dt>
      <dd className="text-display text-[2.6rem] leading-none lg:text-[clamp(2.75rem,4.1vw,4.25rem)]">
        <span className="sr-only">{value}+</span>
        <span aria-hidden className="inline-grid">
          {/* Fantasma no peso do hover: reserva a largura */}
          <span className={cn("invisible col-start-1 row-start-1 inline-flex items-start tabular-nums", HEAVY)}>
            {value}
            <Plus />
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-start transition-[font-variation-settings] duration-700 ease-out-expo motion-reduce:transition-none",
              LIGHT,
              "group-hover/stat:[font-variation-settings:'wdth'_125,'wght'_800]",
            )}
          >
            <Odometer
              key={round}
              value={value}
              delay={round ? 0 : 0.5 + index * 0.12}
              duration={round ? 1100 : 1800}
            />
            <Plus />
          </span>
        </span>
      </dd>
    </div>
  )
}

function Plus() {
  return <span className="text-red-light ml-[0.05em] text-[0.55em] leading-none">+</span>
}

/** Contador de odômetro, só CSS: cada dígito é uma fita que rola até o valor. */
function Odometer({
  value,
  delay = 0,
  duration = 1800,
}: {
  value: number
  delay?: number
  duration?: number
}) {
  const digits = String(value).split("").map(Number)
  return (
    <span className="inline-flex tabular-nums">
      {digits.map((digit, i) => {
        // As unidades giram mais voltas que as dezenas, como um contador real
        const rows = (digits.length - i) * 10 + digit
        return (
          <span key={i} className="relative inline-block h-[1em] overflow-hidden">
            <span
              className="animate-in ease-out-expo fill-mode-both block motion-reduce:animate-none"
              style={
                {
                  transform: `translateY(-${rows}em)`,
                  "--tw-animation-delay": `${delay + i * 0.08}s`,
                  "--tw-animation-duration": `${duration}ms`,
                  animationDuration: `${duration}ms`,
                } as CSSProperties
              }
            >
              {Array.from({ length: rows + 1 }, (_, k) => (
                <span key={k} className="block h-[1em] leading-none">
                  {k % 10}
                </span>
              ))}
            </span>
          </span>
        )
      })}
    </span>
  )
}
