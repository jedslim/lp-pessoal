"use client"

import { useEffect } from "react"
import { site } from "@/lib/site"

declare global {
  interface Window {
    __jedtecGreeted?: boolean
  }
}

// "ANSI Shadow": a mesma largura gorda do logo
const ART = [
  "     ██╗███████╗██████╗ ████████╗███████╗ ██████╗",
  "     ██║██╔════╝██╔══██╗╚══██╔══╝██╔════╝██╔════╝",
  "     ██║█████╗  ██║  ██║   ██║   █████╗  ██║     ",
  "██   ██║██╔══╝  ██║  ██║   ██║   ██╔══╝  ██║     ",
  "╚█████╔╝███████╗██████╔╝   ██║   ███████╗╚██████╗",
  " ╚════╝ ╚══════╝╚═════╝    ╚═╝   ╚══════╝ ╚═════╝",
].join("\n")

const mono = "font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"

/** Recado para quem abre o DevTools. Uma vez por carregamento. */
export function ConsoleGreeting() {
  useEffect(() => {
    // Flag na window: o StrictMode monta o efeito duas vezes no dev
    if (window.__jedtecGreeted) return
    window.__jedtecGreeted = true
    console.log(
      `%c${ART}`,
      `color:#ff343b;${mono};font-size:11px;line-height:1.15;text-shadow:0 0 12px rgba(255,52,59,.45)`,
    )
    console.log(
      `%c${site.name} %c· desenvolvedor full stack`,
      `color:#f2f2f0;${mono};font-size:12px;font-weight:700;padding:6px 0 2px`,
      `color:#9a9aa0;${mono};font-size:12px`,
    )
    console.log(
      `%cAbriu o console para ver como foi feito? Next.js 16, React 19, Tailwind 4, motion e three.js.\nQuer conversar sobre código ou sobre um projeto? %c${site.whatsapp}`,
      `color:#c9c9cc;${mono};font-size:11px;line-height:1.6`,
      `color:#ff343b;${mono};font-size:11px`,
    )
    console.log(
      `%cMeu código público fica no GitHub: %c${site.github}`,
      `color:#9a9aa0;${mono};font-size:11px`,
      `color:#f2f2f0;${mono};font-size:11px`,
    )
  }, [])

  return null
}
