import { useSyncExternalStore } from "react"

/*
 * Reduced motion sem quebrar a hidratação: o servidor não sabe a preferência,
 * então a 1ª renderização do cliente assume "false" e corrige logo em seguida.
 * Para o que o MotionConfig não cobre: valores ligados à rolagem
 * (useTransform), loops e reprodução de vídeo. Animações de entrada não
 * precisam dele (o MotionConfig da raiz já zera o transform).
 */
const QUERY = "(prefers-reduced-motion: reduce)"

const subscribe = (onChange: () => void) => {
  const mq = matchMedia(QUERY)
  mq.addEventListener("change", onChange)
  return () => mq.removeEventListener("change", onChange)
}

export const useReducedMotionSafe = () =>
  useSyncExternalStore(
    subscribe,
    () => matchMedia(QUERY).matches,
    () => false,
  )
