"use client"

import { useEffect, useRef, useState, type ComponentType } from "react"
import { ArrowUpRight, Check, Copy } from "lucide-react"
import { GithubIcon, LinkedinIcon } from "@/components/brand-icons"
import { useScramble } from "@/components/chrome-scramble"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

const tel = `tel:+${site.phone.replace(/\D/g, "")}`

/** Linha final do contato: WhatsApp/telefone (com copiar), LinkedIn e GitHub. */
export function ContactLinks({ className }: { className?: string }) {
  // O mesmo número atende os dois: o rótulo diz isso (o ponto não embaralha)
  const [phoneLabel, scramblePhone] = useScramble("WHATSAPP · TELEFONE")
  return (
    <div
      className={cn(
        // minmax(0,1fr): a trilha não cresce além da caixa em telas estreitas
        "grid grid-cols-[minmax(0,1fr)] divide-y divide-white/10 overflow-hidden rounded-[1.25rem] border border-white/10 bg-background/60 backdrop-blur-sm lg:grid-cols-[1.35fr_1fr_1fr] lg:divide-x lg:divide-y-0",
        className,
      )}
    >
      {/* Abaixo de ~357px o botão quebra para a linha de baixo (o vão
          encolhe antes, para o rótulo duplo caber ao lado dele em 360) */}
      <div
        onPointerEnter={(e) => e.pointerType === "mouse" && scramblePhone()}
        onFocus={scramblePhone}
        className="flex min-h-20 flex-wrap items-center justify-between gap-x-3 gap-y-2 px-5 py-4 max-[379px]:gap-x-2 sm:gap-x-4 sm:px-6 lg:px-8"
      >
        <div className="min-w-0">
          <p className="text-label text-muted-foreground">
            <span aria-hidden>{phoneLabel}</span>
            <span className="sr-only">WhatsApp e telefone</span>
          </p>
          <a
            href={tel}
            className="decoration-red-light/70 inline-flex min-h-10 items-center text-[17px] font-medium whitespace-nowrap tabular-nums underline-offset-4 transition-colors outline-none hover:text-white hover:underline focus-visible:text-red-light focus-visible:underline sm:text-xl"
          >
            {site.phone}
          </a>
        </div>
        <CopyPhone />
      </div>

      <LinkCell href={site.linkedin} label="LinkedIn" value="Jedson Santos" icon={LinkedinIcon} />
      <LinkCell href={site.github} label="GitHub" value="@jedslim" icon={GithubIcon} />
    </div>
  )
}

function LinkCell({
  href,
  label,
  value,
  icon: Icon,
}: {
  href: string
  label: string
  value: string
  icon: ComponentType<{ className?: string }>
}) {
  // O mesmo embaralhar do menu, no rótulo mono
  const [text, scramble] = useScramble(label.toUpperCase())
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onPointerEnter={(e) => e.pointerType === "mouse" && scramble()}
      onFocus={scramble}
      className="group/link flex min-h-20 items-center justify-between gap-4 px-5 py-4 transition-colors duration-300 outline-none hover:bg-white/[0.03] focus-visible:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-red-light/60 focus-visible:ring-inset sm:px-6 lg:px-8"
    >
      <span className="min-w-0">
        <span className="text-label text-muted-foreground group-hover/link:text-foreground/80 flex items-center gap-2 transition-colors duration-300">
          <Icon className="size-3.5" />
          <span aria-hidden>{text}</span>
          <span className="sr-only">{label}</span>
        </span>
        <span className="flex min-h-10 items-center text-lg font-medium sm:text-xl">{value}</span>
      </span>
      <span className="ease-out-expo flex size-10 shrink-0 items-center justify-center rounded-full border border-white/10 transition-[background-color,border-color] duration-500 group-hover/link:border-white group-hover/link:bg-white group-hover/link:text-background">
        <ArrowUpRight className="ease-out-expo size-4 transition-transform duration-500 group-hover/link:rotate-45" />
      </span>
      <span className="sr-only"> (abre em nova aba)</span>
    </a>
  )
}

/**
 * Copia o telefone e confirma ("Copiado"), também para leitor de tela. A
 * troca de rótulo embaralha, como os links mono do menu.
 */
function CopyPhone() {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const [idle, playIdle] = useScramble("COPIAR")
  const [done, playDone] = useScramble("COPIADO")

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(site.phone)
    } catch {
      // Sem a API (contexto inseguro, permissão negada): caminho antigo
      const field = document.createElement("textarea")
      field.value = site.phone
      field.setAttribute("readonly", "")
      field.style.cssText = "position:fixed;opacity:0"
      document.body.appendChild(field)
      field.select()
      document.execCommand("copy")
      field.remove()
    }
    if (!copied) playDone()
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      setCopied(false)
      playIdle()
    }, 2200)
  }

  const Icon = copied ? Check : Copy
  return (
    <>
      <button
        type="button"
        onClick={copy}
        className={cn(
          "ease-out-expo inline-flex h-10 min-w-[6.5rem] shrink-0 items-center justify-center gap-1.5 rounded-full border px-3 font-mono sm:min-w-[7.5rem] sm:gap-2 sm:px-4 text-[11px] tracking-[0.14em] uppercase transition-[background-color,border-color,color] duration-500 outline-none focus-visible:ring-3 focus-visible:ring-red-light/60",
          copied
            ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
            : "text-foreground border-white/15 hover:border-white/40 hover:bg-white/[0.06]",
        )}
      >
        <Icon aria-hidden className="size-3.5" />
        <span aria-hidden>{copied ? done : idle}</span>
        <span className="sr-only">{copied ? "Copiado" : "Copiar telefone"}</span>
      </button>
      {/* Anúncio para leitor de tela */}
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Telefone copiado" : ""}
      </span>
    </>
  )
}
