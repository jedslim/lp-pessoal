import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent } from "react"
import { scrollToTarget } from "@/components/smooth-scroll"

/**
 * Itens da navegação, na ordem do menu. `href`: seção da home (`/#id`) ou
 * outra página (`/portfolio`). `blurb`: uma linha do que tem lá, para o
 * menu aberto (e para quem mais quiser descrever o destino).
 */
export const sections = [
  {
    id: "trabalho",
    href: "/#trabalho",
    label: "Trabalho",
    blurb: "Projetos no ar, com vídeo de cada site",
  },
  {
    id: "processo",
    href: "/#processo",
    label: "Processo",
    blurb: "Como um projeto anda, da conversa ao site no ar",
  },
  {
    id: "sobre",
    href: "/#sobre",
    label: "Sobre",
    blurb: "Quem sou, formação e como eu trabalho",
  },
  {
    id: "portfolio",
    href: "/portfolio",
    label: "Portfólio",
    blurb: "Stack, capacidades e o lado técnico",
  },
  {
    id: "contato",
    href: "/#contato",
    label: "Contato",
    blurb: "Seu projeto, direto no WhatsApp",
  },
] as const

export type SectionId = (typeof sections)[number]["id"]

/** Item que é uma página própria (não uma seção da home). */
export const isPage = (href: string) => !href.includes("#")

/**
 * A âncora de `href` se ela estiver na página aberta agora (`/#sobre`
 * estando na home); senão null, e quem chamou deixa o link navegar.
 */
export function hashHere(href: string): `#${string}` | null {
  const at = href.indexOf("#")
  if (at < 0) return null
  const path = href.slice(0, at) || "/"
  return path === window.location.pathname ? (href.slice(at) as `#${string}`) : null
}

/** Clique num item: na mesma página rola com Lenis; em outra, o Link navega. */
export const onNav = (href: string) => (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  const hash = hashHere(href)
  if (!hash) return
  e.preventDefault()
  goTo(hash)
}

/**
 * Rola até a seção e leva o foco junto (teclado e leitor de tela continuam
 * de onde o olho foi). `0` volta ao topo.
 */
export function goTo(target: `#${string}` | 0) {
  scrollToTarget(target)
  if (target === 0) {
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    return
  }
  const el = document.querySelector<HTMLElement>(target)
  if (!el) return
  if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1")
  // A seção recebe foco, não contorno: o destaque visual é o próprio scroll
  el.classList.add("outline-none")
  el.focus({ preventScroll: true })
}

/* ---------- Trava de rolagem (menu e diálogos) ---------- */

let locks = 0

/**
 * Trava a rolagem da página (com ou sem Lenis) e compensa a barra de rolagem
 * que some, para nada "pular" de lado. Devolve a função que destrava.
 */
export function lockScroll() {
  const html = document.documentElement
  if (locks++ === 0) {
    const gap = window.innerWidth - html.clientWidth
    html.style.overflow = "hidden"
    if (gap > 0) {
      html.style.paddingRight = `${gap}px`
      html.style.setProperty("--lock-gap", `${gap}px`)
    }
    window.__lenis?.stop()
  }
  let released = false
  return () => {
    if (released) return
    released = true
    if (--locks > 0) return
    html.style.overflow = ""
    html.style.paddingRight = ""
    html.style.removeProperty("--lock-gap")
    window.__lenis?.start()
  }
}

/* ---------- Copiar para a área de transferência ---------- */

/** Copia o texto (com fallback para contexto sem Clipboard API). */
export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // http, navegador antigo ou permissão negada
    const area = document.createElement("textarea")
    area.value = text
    area.setAttribute("readonly", "")
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand("copy")
    area.remove()
    return ok
  }
}

/** Foco preso dentro de `root` (Tab e Shift+Tab dão a volta). */
export function trapTab(
  e: KeyboardEvent | ReactKeyboardEvent,
  root: HTMLElement | null,
) {
  if (e.key !== "Tab" || !root) return
  const items = Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  ).filter((el) => el.offsetParent !== null || el === document.activeElement)
  if (items.length === 0) return
  const first = items[0]
  const last = items[items.length - 1]
  const current = document.activeElement
  if (e.shiftKey && (current === first || !root.contains(current))) {
    e.preventDefault()
    last.focus()
  } else if (!e.shiftKey && (current === last || !root.contains(current))) {
    e.preventDefault()
    first.focus()
  }
}
