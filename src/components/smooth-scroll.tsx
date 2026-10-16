"use client"

import { useEffect } from "react"
import Lenis from "lenis"

declare global {
  interface Window {
    __lenis?: Lenis
  }
}

/*
 * Espaço do header fixo nas âncoras: vem só do scroll-margin-top das seções
 * (globals.css). O Lenis já desconta o scroll-margin; somar um offset aqui
 * fazia a seção parar 64px mais baixo no desktop do que no celular.
 */

/**
 * Rolagem suave (Lenis) para mouse e trackpad. Em telas de toque e com
 * reduced motion, o navegador assume a rolagem nativa.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const coarse = window.matchMedia("(pointer: coarse)").matches
    if (reduce || coarse) return

    const lenis = new Lenis({
      lerp: 0.11,
      autoRaf: true,
      anchors: true,
    })
    window.__lenis = lenis
    return () => {
      lenis.destroy()
      delete window.__lenis
    }
  }, [])

  return null
}

/** Rola até um seletor ("#trabalho") ou ao topo (0), com ou sem Lenis. */
export function scrollToTarget(target: string | number) {
  const lenis = window.__lenis
  if (lenis) {
    lenis.scrollTo(target)
    return
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" })
    return
  }
  document.querySelector(target)?.scrollIntoView({ behavior: "smooth" })
}
