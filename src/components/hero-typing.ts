/*
 * Digitação de verdade na hero: o nome (hero-name.tsx) e as teclas 3D
 * (hero-scene-canvas.tsx e hero-keys.tsx) reagem às teclas apertadas, menos
 * quando a pessoa está escrevendo num campo ou usando um atalho do navegador.
 */

/** Foco num campo de texto: a digitação é da pessoa, não da hero. */
export function isTypingTarget(t: EventTarget | null) {
  const el = t as HTMLElement | null
  return !!el?.closest?.(
    "input, textarea, select, [contenteditable=''], [contenteditable='true']",
  )
}

/** "É" e "e" contam como a mesma letra. */
export const foldKey = (s: string) =>
  s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()
