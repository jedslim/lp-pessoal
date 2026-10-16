"use client"

import { useRef, useState, type ComponentType, type CSSProperties, type MouseEvent } from "react"
import { ArrowUp, ArrowUpRight, Mail, Rows2, Shuffle } from "lucide-react"
import {
  GithubIcon,
  LinkedinIcon,
  WhatsappIcon,
} from "@/components/brand-icons"
import { goTo, sections } from "@/components/chrome-nav"
import { ScrambleText } from "@/components/chrome-scramble-text"
import { FooterName } from "@/components/footer-name"
import {
  FooterPlayground,
  type PlaygroundHandle,
  type PlaygroundState,
} from "@/components/footer-playground"
import { ButtonLink } from "@/components/kit/button-link"
import { StatusDot } from "@/components/kit/status-dot"
import { PrivacyDialog } from "@/components/privacy-dialog"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

type Contact = {
  label: string
  href: string
  Icon: ComponentType<{ className?: string }>
}

const contacts: Contact[] = [
  { label: "WhatsApp", href: site.whatsapp, Icon: WhatsappIcon },
  { label: "LinkedIn", href: site.linkedin, Icon: LinkedinIcon },
  { label: "GitHub", href: site.github, Icon: GithubIcon },
  ...(site.email
    ? [{ label: "E-mail", href: `mailto:${site.email}`, Icon: Mail }]
    : []),
]

/** Mesmo container do site; o palco das teclas repete estas margens. */
const container = "mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12"

const heading = "text-muted-foreground mb-3 text-[13px] sm:mb-4"

const ring =
  "outline-none focus-visible:ring-2 focus-visible:ring-red-light/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"

/** Link de lista: legível, com o scramble e um quadradinho vermelho no hover. */
const listLink = cn(
  "group/l text-foreground/80 hover:text-foreground flex min-h-9 w-fit items-center gap-2.5 rounded-sm text-[17px] font-medium transition-colors",
  ring,
)
const bullet =
  "bg-red-light ease-out-expo size-1.5 shrink-0 scale-0 transition-transform duration-500 group-hover/l:scale-100 group-focus-visible/l:scale-100"

const onAnchor = (hash: `#${string}`) => (e: MouseEvent) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
  e.preventDefault()
  goTo(hash)
}

/**
 * Estojo do deck, na linguagem do teclado do Stack: grafite com a luz de
 * recorte vermelha na quina direita, a frente com um filete vermelho e a
 * sombra caindo na mesa. Medido em --u (escrito pelo palco das teclas).
 */
const deckStyle: CSSProperties = {
  background: [
    "radial-gradient(90% 140% at 94% -20%, rgb(229 9 20 / 0.1), transparent 60%)",
    "linear-gradient(180deg, #131316 0%, #0c0c0e 55%, #09090b 100%)",
  ].join(", "),
  boxShadow: [
    "inset 0 1px 0 rgb(255 255 255 / 0.07)",
    "inset -1px 0 0 rgb(255 52 59 / 0.32)",
    "inset 0 -1px 0 rgb(255 255 255 / 0.1)",
    "0 calc(var(--u) * 0.08) 0 -1px #060607",
    "0 calc(var(--u) * 0.08) 0 0 rgb(255 52 59 / 0.22)",
    "0 calc(var(--u) * 0.5) calc(var(--u) * 0.8) calc(var(--u) * -0.25) rgb(0 0 0 / 0.95)",
  ].join(", "),
}

/**
 * Rodapé numa peça só: no topo, assinatura, seções, contato e a chamada; no
 * chão, um deck de teclado onde as teclas J E D T E C caem e se empilham
 * (footer-playground.tsx). Dá para arrastar, jogar, empurrar, digitar e
 * arrumar: cada letra encaixa no seu soquete e os LEDs do deck acendem.
 * Todo link embaralha no hover, como o menu.
 */
export function SiteFooter() {
  const play = useRef<PlaygroundHandle>(null)
  const [keys, setKeys] = useState<PlaygroundState>({
    mode: "idle",
    arranged: false,
    touched: false,
  })
  const live = keys.mode === "live"
  const arranged = keys.arranged && keys.mode !== "idle"

  return (
    <footer
      data-arranged={arranged ? "" : undefined}
      className="bg-background relative isolate overflow-hidden border-t border-white/[0.07] [--dp:10px] [--u:47px] sm:[--dp:16px] sm:[--u:58px] lg:[--dp:24px] lg:[--u:84px] xl:[--u:104px] min-[1440px]:[--u:112px]"
    >
      <div className={cn(container, "relative pt-14 sm:pt-20 lg:pt-24")}>
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:gap-y-12 lg:grid-cols-12 lg:gap-x-8">
          {/* Assinatura */}
          <div className="col-span-2 sm:col-span-1 lg:col-span-4">
            <FooterName
              lines={["Jedson", "Santos"]}
              className="text-display text-[clamp(2.75rem,12vw,4.5rem)] tracking-[-0.03em] lg:text-[clamp(3.25rem,5vw,4.75rem)]"
            />
            <p className="text-foreground/85 mt-6 text-[17px]">
              Desenvolvedor full stack
            </p>
            <p className="text-muted-foreground mt-2 flex items-center gap-2.5 text-[15px]">
              <StatusDot />
              Disponível para projetos e vagas
            </p>
          </div>

          {/* Seções */}
          <nav aria-label="Rodapé" className="lg:col-span-2 lg:col-start-5 xl:col-start-6">
            <p className={heading}>Seções</p>
            <ul>
              {sections.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#${s.id}`}
                    onClick={onAnchor(`#${s.id}`)}
                    className={listLink}
                  >
                    <span aria-hidden className={bullet} />
                    <ScrambleText
                      text={s.label}
                      preserveCase
                      className="ease-out-expo -ml-4 transition-[margin] duration-500 group-hover/l:ml-0 group-focus-visible/l:ml-0"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Contato */}
          <div className="lg:col-span-2">
            <p className={heading}>Contato</p>
            <ul>
              {contacts.map(({ label, href, Icon }) => {
                const external = href.startsWith("http")
                return (
                  <li key={label}>
                    <a
                      href={href}
                      aria-label={external ? `${label} (abre em nova aba)` : label}
                      {...(external
                        ? { target: "_blank", rel: "noopener noreferrer" }
                        : {})}
                      className={listLink}
                    >
                      <Icon className="group-hover/l:text-red-light size-4 shrink-0 text-white/45 transition-colors" />
                      <ScrambleText text={label} preserveCase />
                      <ArrowUpRight
                        aria-hidden
                        className="ease-out-expo size-3.5 shrink-0 -translate-x-1 text-white/30 opacity-0 transition-[opacity,translate] duration-500 group-hover/l:translate-x-0 group-hover/l:opacity-100"
                      />
                    </a>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* Chamada: a ação útil do rodapé */}
          {/* Celular: depois dos links. Tablet: ao lado do nome. lg: a
              coluna da direita */}
          <div className="col-span-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 lg:col-span-4 lg:col-start-9 xl:col-span-3 xl:col-start-10">
            <div>
              <p className="text-display-2 text-[clamp(1.75rem,7vw,2.1rem)] leading-[0.98] text-balance lg:text-[clamp(1.6rem,2.1vw,2.1rem)]">
                Tem um projeto ou uma vaga?
              </p>
              <p className="text-muted-foreground mt-3 max-w-[32ch] text-[15px] leading-relaxed text-pretty">
                A conversa abre no WhatsApp com a mensagem pronta.
              </p>
            </div>
            <div className="mt-6 flex flex-col items-start gap-3">
              <ButtonLink href={site.whatsapp} icon="whatsapp">
                Chamar no WhatsApp
              </ButtonLink>
              <p className="text-muted-foreground pl-1 text-[13px] tabular-nums">
                {site.phone}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Deck: a placa onde as teclas caem. Paredes invisíveis nas bordas
          internas (o acolchoamento --dp), chão na base da área de jogo */}
      <div className={cn(container, "mt-14 sm:mt-16 lg:mt-20")}>
        <div data-footer-deck className="relative">
          {/* A luz do teclado batendo na mesa; mais forte com tudo encaixado */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[10%] -bottom-[22%] h-[45%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(229_9_20/0.42),rgb(229_9_20/0.12)_55%,transparent)] opacity-35 blur-[36px] transition-opacity duration-700 [[data-arranged]_&]:opacity-90"
          />
          <div
            className="relative rounded-[calc(var(--dp)+var(--u)*0.1)] px-[var(--dp)] pb-[var(--dp)]"
            style={deckStyle}
          >
            {/* Faixa de cima do estojo: a dica e os LEDs indicadores */}
            <div className="flex h-[max(1.75rem,calc(var(--u)*0.4))] items-center justify-between gap-4 px-[calc(var(--u)*0.06)]">
              <p
                aria-hidden
                className={cn(
                  "text-label truncate text-[10px] text-white/35 transition-opacity duration-700 sm:text-[11px]",
                  live && !keys.touched ? "opacity-100" : "opacity-0",
                )}
              >
                <span className="pointer-coarse:hidden">
                  Arraste, jogue ou digite <span className="text-white/60">jedtec</span>
                </span>
                <span className="pointer-fine:hidden">Arraste e jogue as teclas</span>
              </p>
              <div aria-hidden className="flex shrink-0 items-center gap-[max(6px,calc(var(--u)*0.09))]">
                <Led on />
                <Led on={keys.mode !== "idle"} />
                <Led on={arranged} bright />
              </div>
            </div>
            {/* Área de jogo: duas fileiras de tecla de altura */}
            <div data-footer-floor className="h-[calc(var(--u)*2+1px)]" />
          </div>
          {/* Fio de luz na quina da frente */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-[3%] bottom-0 left-[6%] h-px bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.28)_30%,rgb(255_255_255/0.12)_70%,rgb(255_52_59/0.6))]"
          />
        </div>
      </div>

      {/* Linha final, alinhada ao container. Celular: © e política à
          esquerda; topo e teclas à direita. lg: © · teclas · topo */}
      <div className={cn(container, "mt-8 sm:mt-10")}>
        <div className="text-muted-foreground grid grid-cols-[1fr_auto] items-center gap-x-6 border-t border-white/[0.07] py-3 text-[13px] sm:py-4 lg:grid-cols-[1fr_auto_1fr] lg:py-5">
          <div className="row-span-2 flex flex-col items-start gap-x-4 sm:flex-row sm:flex-wrap sm:items-center lg:row-span-1">
            <span className="flex min-h-10 items-center">© 2026 Jedson Santos</span>
            <PrivacyDialog
              className={cn(
                "hover:text-foreground inline-flex min-h-10 cursor-pointer items-center rounded-sm underline decoration-white/20 underline-offset-4 transition-colors hover:decoration-white/60",
                ring,
              )}
            >
              <ScrambleText text="Política de privacidade" preserveCase />
            </PrivacyDialog>
          </div>

          {/* Controle das teclas (some com reduced motion) */}
          <div
            className={cn(
              "col-start-2 row-start-2 flex items-center justify-end transition-opacity duration-500 lg:row-start-1 lg:justify-center",
              live ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={!live}
          >
            <button
              type="button"
              data-footer-arrange
              onClick={() => play.current?.toggle()}
              tabIndex={live ? 0 : -1}
              className={cn(
                "group/k text-foreground/85 hover:text-foreground inline-flex h-9 items-center gap-2 rounded-md border border-white/[0.12] bg-white/[0.04] px-3 shadow-[inset_0_-2px_0_rgb(0_0_0/0.45),inset_0_1px_0_rgb(255_255_255/0.06)] transition-[color,border-color,translate] hover:border-white/25 active:translate-y-px",
                ring,
              )}
            >
              {keys.arranged ? (
                <Shuffle aria-hidden className="text-red-light size-3.5" />
              ) : (
                <Rows2 aria-hidden className="text-red-light size-3.5" />
              )}
              {/* key: remonta ao trocar o rótulo (um scramble em curso não
                  termina escrevendo o rótulo antigo) */}
              <ScrambleText
                key={keys.arranged ? "a" : "b"}
                text={keys.arranged ? "Bagunçar" : "Arrumar as teclas"}
                preserveCase
              />
            </button>
          </div>

          <button
            type="button"
            onClick={() => goTo(0)}
            className={cn(
              "group/top hover:text-foreground col-start-2 row-start-1 flex h-10 items-center gap-2 justify-self-end rounded-sm transition-colors lg:col-start-3",
              ring,
            )}
          >
            <ScrambleText text="Voltar ao topo" preserveCase />
            <ArrowUp
              aria-hidden
              className="ease-out-expo size-3.5 transition-transform duration-500 group-hover/top:-translate-y-0.5"
            />
          </button>
        </div>
      </div>

      <FooterPlayground ref={play} onState={setKeys} />
    </footer>
  )
}

/** LED indicador do estojo (como os de caps lock). */
function Led({ on, bright }: { on?: boolean; bright?: boolean }) {
  return (
    <span
      className={cn(
        "size-[max(5px,calc(var(--u)*0.055))] rounded-full transition-[background-color,box-shadow] duration-700",
        on
          ? bright
            ? "bg-[#ff3b42] shadow-[0_0_8px_rgb(255_52_59/0.9),0_0_2px_rgb(255_200_200/0.8)]"
            : "bg-[#b3121a] shadow-[0_0_5px_rgb(229_9_20/0.6)]"
          : "bg-white/[0.08]",
      )}
    />
  )
}
