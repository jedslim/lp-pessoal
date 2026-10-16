"use client"

import type { ReactNode } from "react"
import { MotionConfig } from "motion/react"

/**
 * Reduced motion para o site inteiro, no próprio motion: com a preferência
 * ligada, transform e layout pulam direto para o fim e só a opacidade anima.
 * Assim os componentes declaram um `initial` só (igual no servidor e no
 * cliente) e a hidratação não diverge.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
