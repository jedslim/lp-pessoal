"use client"

import { useId, useRef, type PointerEvent } from "react"
import { CheckCheck, ChevronRight } from "lucide-react"
import { useScramble } from "@/components/chrome-scramble"
import { ButtonLink } from "@/components/kit/button-link"

export type PathKind = "projeto" | "vaga"

/**
 * Um dos dois caminhos do contato. O card inteiro é clicável (o link do
 * botão se estica por cima dele) e, no hover, a borda acende seguindo o
 * cursor e o título ganha a seta de seleção de um prompt de terminal.
 * O kicker é a flag do ramo do garfo acima (`--projeto`, `--vaga`) e
 * embaralha junto com ela. O balão mostra a mensagem que já vai
 * preenchida no WhatsApp (o ícone do botão avisa para onde ele leva).
 */
export function ContactPath({
  kind,
  index,
  title,
  text,
  cta,
  ctaShort,
  href,
  onHot,
}: {
  /** Liga o card ao ramo da bifurcação acima dele. */
  kind: PathKind
  index: string
  title: string
  text: string
  cta: string
  /** Rótulo para telas abaixo de 380px, onde o longo não cabe na pílula. */
  ctaShort?: string
  href: string
  /** Hover (mouse) ou foco no card: avisa a bifurcação. */
  onHot?: (on: boolean) => void
}) {
  const ref = useRef<HTMLElement>(null)
  const bubbleId = useId()
  // A mensagem pronta vem do próprio link (site.ts), sem duplicar texto
  const message = new URL(href).searchParams.get("text")
  const [flagText, playFlag] = useScramble(`--${kind}`, { preserveCase: true })
  const hot = (on: boolean) => {
    if (on) playFlag()
    onHot?.(on)
  }

  // Posição do cursor em variáveis CSS: sem estado, sem re-render
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current
    if (!el || e.pointerType !== "mouse") return
    const r = el.getBoundingClientRect()
    el.style.setProperty("--mx", `${e.clientX - r.left}px`)
    el.style.setProperty("--my", `${e.clientY - r.top}px`)
  }

  return (
    <article
      ref={ref}
      data-path={kind}
      onPointerMove={onMove}
      onPointerEnter={(e) => e.pointerType === "mouse" && hot(true)}
      onPointerLeave={() => hot(false)}
      onFocus={() => hot(true)}
      onBlur={() => hot(false)}
      className="group/path relative isolate flex flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/[0.018] p-6 transition-colors duration-500 hover:border-white/15 has-[a:focus-visible]:border-red-light/60 sm:p-9 lg:min-h-[26rem] lg:p-11"
    >
      {/* Luz que segue o cursor: borda acesa + leve brilho no fundo */}
      <span
        aria-hidden
        className="ease-out-expo pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-0 transition-opacity duration-500 group-hover/path:opacity-100"
        style={{
          background:
            "radial-gradient(520px circle at var(--mx, 50%) var(--my, 0%), rgb(255 255 255 / 0.045), transparent 60%)",
        }}
      />
      <span
        aria-hidden
        className="ease-out-expo pointer-events-none absolute inset-0 rounded-[inherit] p-px opacity-0 transition-opacity duration-500 group-hover/path:opacity-100"
        style={{
          background:
            "radial-gradient(440px circle at var(--mx, 50%) var(--my, 0%), rgb(255 52 59), transparent 65%)",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
        }}
      />

      <div className="flex items-start justify-between gap-6">
        {/* A flag do ramo do garfo: liga o card ao desenho acima dele */}
        <p className="text-label text-muted-foreground flex items-center gap-3 pt-1">
          <span className="text-red-light">{index}</span>
          <span aria-hidden className="bg-border h-px w-8" />
          {/* Só visual: o título já diz o caminho para o leitor de tela */}
          <span
            aria-hidden
            className="ease-out-expo group-hover/path:text-red-light group-has-[a:focus-visible]/path:text-red-light font-mono text-[12px] tracking-normal normal-case transition-colors duration-500"
          >
            {flagText}
          </span>
        </p>

        {message && (
          // Prévia da mensagem que abre preenchida; no hover ela "é enviada"
          <p
            id={bubbleId}
            className="ease-out-expo bg-surface text-foreground/80 group-hover/path:border-red-light/40 group-hover/path:bg-red-primary/[0.09] relative hidden max-w-[19.5rem] rounded-[1.1rem] rounded-br-[0.3rem] border border-white/10 px-4 pt-3 pb-2 text-[13px] leading-snug transition-[translate,border-color,background-color] duration-500 group-hover/path:-translate-y-1 motion-reduce:transition-none sm:block md:hidden xl:block"
          >
            <span className="sr-only">Mensagem pronta: </span>
            {message}
            <span className="mt-1 flex justify-end">
              <CheckCheck
                aria-hidden
                className="ease-out-expo group-hover/path:text-red-light size-4 text-white/30 transition-colors duration-500"
              />
            </span>
          </p>
        )}
      </div>

      <h3 className="text-display-2 relative mt-10 text-[clamp(2rem,3.3vw,3.4rem)] sm:mt-12">
        {/* Seta de seleção, como num menu de CLI */}
        <ChevronRight
          aria-hidden
          strokeWidth={3}
          className="ease-out-expo text-red-light absolute top-1/2 left-0 size-[0.62em] -translate-x-3 -translate-y-1/2 opacity-0 transition-[opacity,translate] duration-500 group-hover/path:translate-x-0 group-hover/path:opacity-100 motion-reduce:transition-none"
        />
        <span className="ease-out-expo block transition-transform duration-500 group-hover/path:translate-x-[0.82em] motion-reduce:transition-none">
          {title}
        </span>
      </h3>

      <p className="text-muted-foreground mt-5 max-w-[36ch] text-base leading-relaxed text-pretty sm:text-lg">
        {text}
      </p>

      <div className="mt-auto pt-10">
        <ButtonLink
          href={href}
          variant="ghost"
          size="lg"
          icon="whatsapp"
          aria-describedby={message ? bubbleId : undefined}
          // O link cobre o card todo (::after), e acende junto com ele.
          // Abaixo de 380px a pílula perde um pouco de respiro à esquerda
          className="static w-full justify-between after:absolute after:inset-0 after:rounded-[1.75rem] hover:border-red-primary hover:bg-red-primary hover:text-white focus-visible:border-red-primary focus-visible:bg-red-primary max-[379px]:pl-5 sm:w-auto"
        >
          {ctaShort ? (
            <>
              <span className="max-[379px]:hidden">{cta}</span>
              <span className="min-[380px]:hidden">{ctaShort}</span>
            </>
          ) : (
            cta
          )}
          <span className="sr-only"> (abre o WhatsApp)</span>
        </ButtonLink>
      </div>
    </article>
  )
}
