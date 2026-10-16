"use client"

import { useEffect, useRef, useState } from "react"
import { animate, useInView, useReducedMotion } from "motion/react"

/**
 * Número que conta ao entrar na tela. O servidor já entrega o valor final
 * (SEO, sem JS); se o número já estiver visível ao carregar, fica parado
 * para não piscar "80 → 0 → 80".
 */
export function CountUp({
  to,
  duration = 1.8,
  prefix = "",
  suffix = "",
  className,
}: {
  to: number
  duration?: number
  prefix?: string
  suffix?: string
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" })
  const [value, setValue] = useState(to)
  const armed = useRef(false)

  // Fora da tela no carregamento: zera (ninguém vê) e conta ao aparecer
  useEffect(() => {
    const el = ref.current
    if (!el || reduce) return
    const r = el.getBoundingClientRect()
    if (r.top > window.innerHeight || r.bottom < 0) {
      armed.current = true
      setValue(0)
    }
  }, [reduce])

  useEffect(() => {
    if (!inView || !armed.current) return
    armed.current = false
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setValue(Math.round(v)),
    })
    return () => controls.stop()
  }, [inView, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      <span className="tabular-nums">{value}</span>
      {suffix}
    </span>
  )
}
