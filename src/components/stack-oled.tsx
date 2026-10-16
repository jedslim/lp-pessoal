"use client"

import { useEffect, useRef, useState } from "react"
import { Braces, TextCursorInput, type LucideIcon } from "lucide-react"
import { useScramble } from "@/components/chrome-scramble"
import { useReducedMotionSafe } from "@/lib/use-reduced-motion-safe"
import type { StackElement } from "@/lib/stack"
import { cn } from "@/lib/utils"
import s from "./stack-keyboard.module.css"

/** O que o visor está mostrando. */
export type Screen =
  | { kind: "off" }
  | { kind: "boot" }
  | { kind: "hint"; title: string; text: string }
  | { kind: "tool"; tool: StackElement; meta: string; accent?: string }
  | {
      kind: "list"
      title: string
      meta: string
      /** Rótulo em cima da lista ("3 teclas acesas"). */
      count: string
      items: string[]
      /** Busca digitada: o título leva o cursor e não embaralha. */
      typed?: boolean
    }
  | { kind: "empty"; title: string; meta: string; text: string }
  | { kind: "fn"; title: string; meta: string; text: string }
  | { kind: "volume"; value: number }

/* Dois itens do stack não estão no simple-icons: um ícone genérico no lugar */
const FALLBACK: Record<string, LucideIcon> = {
  ACF: TextCursorInput,
  "APIs REST": Braces,
}

export function ToolMark({ tool, className }: { tool: StackElement; className?: string }) {
  const Fallback = FALLBACK[tool.name]
  if (tool.path)
    return (
      <svg viewBox="0 0 24 24" aria-hidden fill="currentColor" className={className}>
        <path d={tool.path} />
      </svg>
    )
  if (Fallback) return <Fallback aria-hidden strokeWidth={1.8} className={className} />
  return null
}

/** Título que embaralha e se resolve a cada troca (o efeito do menu). */
function Scrambled({ text }: { text: string }) {
  const [out, play] = useScramble(text, { preserveCase: true, duration: 360 })
  useEffect(() => play(), [play])
  return <span aria-hidden>{out}</span>
}

/** Texto "digitado" no visor, com o cursor em bloco no fim (`speed` = ms por letra). */
function Typed({ text, speed = 15 }: { text: string; speed?: number }) {
  const reduce = useReducedMotionSafe()
  const [shown, setShown] = useState(0)
  const [source, setSource] = useState(text)
  const raf = useRef(0)

  // Texto novo: recomeça do zero (derivado na renderização, sem efeito)
  if (source !== text) {
    setSource(text)
    setShown(0)
  }

  useEffect(() => {
    if (reduce) return
    const start = performance.now()
    const tick = (now: number) => {
      const n = Math.min(text.length, Math.floor((now - start) / speed))
      setShown(n)
      if (n < text.length) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [text, speed, reduce])

  const n = reduce ? text.length : shown
  return (
    <>
      <span aria-hidden>{text.slice(0, n)}</span>
      <span aria-hidden className={s.cursor} />
    </>
  )
}

const BARS = 16

/**
 * O visor do teclado (aria-hidden: o leitor de tela recebe o mesmo conteúdo
 * pela região "polite" do teclado, só quando a pessoa age).
 */
export function StackOled({ screen }: { screen: Screen }) {
  const key =
    screen.kind === "tool"
      ? `t${screen.tool.n}${screen.meta}`
      : screen.kind === "volume"
        ? "vol"
        : `${screen.kind}${"title" in screen ? screen.title : ""}`

  return (
    <div className={s.oled} aria-hidden>
      <div key={key} className={cn(s.screen, s.screenIn)}>
        {screen.kind === "boot" && (
          <>
            <span className={s.iconBox}>
              <JMark />
            </span>
            <div className={s.main}>
              <p className={s.meta}>Iniciando</p>
              <p className={s.title}>
                JED<span className={s.accent}>TEC</span>
              </p>
            </div>
            <div className={s.body}>
              <p className={s.meta}>Stack</p>
              <p className={s.text}>
                <Typed text="23 teclas, 4 fileiras. Cada uma é uma ferramenta que eu uso." speed={22} />
              </p>
            </div>
          </>
        )}

        {screen.kind === "hint" && (
          <>
            <span className={cn(s.iconBox, s.accent)}>
              <PromptMark />
            </span>
            <div className={s.main}>
              <p className={s.meta}>Pronto</p>
              <p className={s.title}>
                {screen.title}
                <span className={s.cursor} />
              </p>
            </div>
            <div className={s.body}>
              <p className={s.meta}>Como usar</p>
              <p className={s.text}>
                <Typed text={screen.text} />
              </p>
            </div>
          </>
        )}

        {screen.kind === "tool" && (
          <>
            <span className={s.iconBox}>
              <ToolMark tool={screen.tool} />
            </span>
            <div className={s.main}>
              <p className={s.meta}>
                {screen.accent && <span className={s.accent}>{screen.accent}</span>}
                <span>{screen.meta}</span>
              </p>
              <p className={s.title}>
                <Scrambled text={screen.tool.name} />
              </p>
            </div>
            <div className={s.body}>
              <p className={s.meta}>Para que eu uso</p>
              <p className={s.text}>
                <Typed text={screen.tool.use} />
              </p>
            </div>
          </>
        )}

        {screen.kind === "list" && (
          <>
            <span className={cn(s.iconBox, s.accent)}>
              <PromptMark />
            </span>
            <div className={s.main}>
              <p className={s.meta}>{screen.meta}</p>
              <p className={s.title}>
                {screen.typed ? (
                  <>
                    {screen.title}
                    <span className={s.cursor} />
                  </>
                ) : (
                  <Scrambled text={screen.title} />
                )}
              </p>
            </div>
            <div className={s.body}>
              <p className={s.meta}>{screen.count}</p>
              <ul className={s.chips}>
                {screen.items.map((item) => (
                  <li key={item} className={s.chip}>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {(screen.kind === "empty" || screen.kind === "fn") && (
          <>
            <span className={cn(s.iconBox, s.accent)}>
              <PromptMark />
            </span>
            <div className={s.main}>
              <p className={s.meta}>{screen.meta}</p>
              <p className={s.title}>
                <Scrambled text={screen.title} />
              </p>
            </div>
            <div className={s.body}>
              <p className={s.meta}>{screen.kind === "empty" ? "Tente" : "Esta tecla"}</p>
              <p className={s.text}>
                <Typed text={screen.text} />
              </p>
            </div>
          </>
        )}

        {screen.kind === "volume" && (
          <>
            <span className={cn(s.iconBox, screen.value > 0 && s.accent)}>
              <SpeakerMark on={screen.value > 0} />
            </span>
            <div className={s.main}>
              <p className={s.meta}>Som das teclas</p>
              <p className={s.title}>{screen.value > 0 ? `${screen.value}%` : "Mudo"}</p>
            </div>
            <div className={s.body}>
              <p className={s.meta}>Volume</p>
              <div className={s.bars}>
                {Array.from({ length: BARS }, (_, i) => (
                  <span
                    key={i}
                    className={s.bar}
                    data-on={screen.value > (i / BARS) * 100}
                    style={{ height: `${28 + (i / (BARS - 1)) * 72}%` }}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <span className={s.glass} />
    </div>
  )
}

/** O J da JEDTEC (traço quadrado do logo). */
export function JMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" aria-hidden fill="currentColor" className={className}>
      <path d="M22 0H29V15A5 5 0 0 1 24 20H5A5 5 0 0 1 0 15V11.6H7V14.2H22Z" />
    </svg>
  )
}

function PromptMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M4 6.5 9.5 12 4 17.5l1.6 1.6L12.7 12 5.6 4.9zM13 17h8v2.2h-8z" />
    </svg>
  )
}

function SpeakerMark({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M3 9h4l5-4.5v15L7 15H3z" />
      {on ? (
        <path d="M15.2 8.3a5 5 0 0 1 0 7.4l-1.3-1.4a3.1 3.1 0 0 0 0-4.6zM17.8 5.6a8.8 8.8 0 0 1 0 12.8l-1.3-1.4a6.9 6.9 0 0 0 0-10z" />
      ) : (
        <path d="m14.3 9.4 1.4-1.4 2.3 2.3 2.3-2.3 1.4 1.4-2.3 2.3 2.3 2.3-1.4 1.4-2.3-2.3-2.3 2.3-1.4-1.4 2.3-2.3z" />
      )}
    </svg>
  )
}
