"use client"

import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react"
import { useInView } from "motion/react"
import { ArrowDown } from "lucide-react"
import { AboutConfig, type AboutLink } from "@/components/about-config"
import { AboutFigure } from "@/components/about-figure"
import { AboutSheet } from "@/components/about-sheet"
import { AboutStrike } from "@/components/about-strike"
import { goTo } from "@/components/chrome-nav"
import { useScramble } from "@/components/chrome-scramble"
import { ButtonLink } from "@/components/kit/button-link"
import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import { site } from "@/lib/site"
import { cn } from "@/lib/utils"

/**
 * Statement em duas vozes: a premissa menor, em cinza (com o grifo de
 * revisor em "mais complexa"), e a resposta enorme. O tamanho do h2 é o da
 * resposta; a premissa encolhe em `em`, então a máscara de cada linha (em
 * `em` do h2) sobra para acentos e cedilha.
 */
const statement: ReactNode[] = [
  "Boas soluções não começam pela",
  <>
    tecnologia <AboutStrike>mais complexa</AboutStrike>.
  </>,
  // No celular a resposta vira um cartaz de 4 linhas, uma palavra por linha
  <>
    Começam
    <br className="sm:hidden" /> pela
  </>,
  <>
    escolha
    <br className="sm:hidden" />{" "}
    <span className="font-serif text-[1.08em] font-normal tracking-[-0.01em] [font-stretch:normal] [font-synthesis:none]">
      certa.
    </span>
  </>,
]

const statementLine = (i: number) =>
  i < 2
    ? cn(
        // No celular a premissa cabe em uma linha cada (sem quebra dentro da máscara)
        "text-ink-muted text-[0.3em] leading-[1.12] font-semibold tracking-[-0.022em] sm:text-[0.34em] sm:leading-[1.08]",
        i === 1 && "mb-[0.6em]",
      )
    : undefined

/** Marca de registro de gráfica (⊕), ornamento do cabeçalho. */
function RegMark() {
  return (
    <svg aria-hidden viewBox="0 0 16 16" className="size-3.5 text-ink/45">
      <circle cx="8" cy="8" r="4.5" fill="none" stroke="currentColor" />
      <path d="M8 0v16M0 8h16" stroke="currentColor" />
    </svg>
  )
}

/** Título corrente da página: embaralha e se resolve quando o cabeçalho entra. */
function RunningHead({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true, amount: 1 })
  const [out, play] = useScramble(text)
  useEffect(() => {
    if (inView) play()
  }, [inView, play])
  return (
    <p ref={ref} className="text-label text-ink-muted hidden md:block">
      <span aria-hidden>{out}</span>
      <span className="sr-only">{text}</span>
    </p>
  )
}

/**
 * "Vira a folha" para o contato: um link curto (o rótulo "[06] Contato" já
 * abre a seção seguinte logo abaixo). O rótulo embaralha como os links do menu.
 */
function NextPage() {
  const label = "Contato"
  const [text, scramble] = useScramble(label.toUpperCase())
  return (
    <a
      href="#contato"
      onPointerEnter={scramble}
      onFocus={scramble}
      onClick={(e: MouseEvent) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
        e.preventDefault()
        goTo("#contato")
      }}
      className="group/next text-label text-ink relative flex min-h-10 items-center gap-3 rounded-sm py-2 outline-none focus-visible:ring-2 focus-visible:ring-red-primary/60"
    >
      <span
        aria-hidden
        // A largura (não scale) cresce: o fio estica e empurra o texto, sem sobrepor
        className="bg-ink/25 ease-out-expo group-hover/next:bg-ink group-focus-visible/next:bg-ink h-px w-6 transition-[width,background-color] duration-500 group-hover/next:w-12 sm:w-10 sm:group-hover/next:w-20"
      />
      <span aria-hidden>{text}</span>
      <span className="sr-only">{label}</span>
      <ArrowDown
        aria-hidden
        className="ease-out-expo size-3.5 transition-transform duration-500 group-hover/next:translate-y-0.5"
      />
    </a>
  )
}

export function About() {
  const ref = useRef<HTMLElement>(null)
  const [link, setLink] = useState<AboutLink | null>(null)

  return (
    <section
      id="sobre"
      ref={ref}
      aria-label="Sobre"
      data-tone="light"
      className="text-ink relative isolate pt-24 pb-8 sm:pt-28 sm:pb-10 lg:pt-40 lg:pb-12"
    >
      <AboutSheet target={ref} />

      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Cabeçalho de revista: seção, título da matéria e a marca de registro */}
        <div className="border-ink/15 flex items-center justify-between gap-6 border-b pb-5">
          {/* O índice num vermelho de texto mais fechado: o red-primary fica em
              3,8:1 sobre o bone; este passa de 5,7:1 */}
          <SectionLabel
            index="05"
            label="Sobre"
            tone="light"
            className="[&>span:first-child]:text-[#B8000D]"
          />
          <RunningHead text={`Perfil · ${site.name}`} />
          <RegMark />
        </div>

        <SplitLines
          as="h2"
          lines={statement}
          lineClassName={statementLine}
          stagger={0.08}
          className="text-display mt-14 text-[14vw] sm:mt-20 sm:text-[min(9.6vw,9.25rem)] lg:mt-24"
        />

        {/* Página dupla: retrato | fio | texto e config */}
        <div className="mt-16 grid gap-16 sm:mt-24 lg:mt-32 lg:grid-cols-[minmax(0,5fr)_1px_minmax(0,6fr)] lg:gap-x-14 xl:gap-x-20">
          {/* No desktop o retrato acompanha a leitura da coluna ao lado */}
          <AboutFigure className="mx-auto w-full max-w-[30rem] lg:sticky lg:top-28 lg:max-w-none lg:self-start" />

          <div aria-hidden className="bg-ink/10 hidden lg:block" />

          <div className="min-w-0">
            <div className="max-w-[38rem]">
              <p className="text-ink text-[1.3rem] leading-[1.45] tracking-[-0.012em] text-pretty sm:text-[1.6rem]">
                Sou {site.name}, desenvolvedor full stack. Hoje faço parte do
                time da Agência ILI, onde cuido de sites e sistemas do front ao
                back.
              </p>
              <p className="text-ink-muted mt-7 text-base leading-relaxed text-pretty sm:text-lg">
                E estou{" "}
                <strong className="text-ink font-medium">
                  aberto a novas propostas
                </strong>
                : um projeto como freela ou uma vaga em outro time.
              </p>
              <p className="text-ink-muted mt-4 text-base leading-relaxed text-pretty sm:text-lg">
                Sou formado em Análise e Desenvolvimento de Sistemas e fiz o
                curso de arquitetura de multiagentes da StartSe. Mas não parei
                por aí: sigo estudando, principalmente IA aplicada ao
                desenvolvimento, e levo para cada projeto o que aprendo.
              </p>
            </div>

            <AboutConfig active={link} onLink={setLink} className="mt-14 lg:mt-16" />

            {/* No celular, as duas pílulas lado a lado (a partir de 360px), cada
                uma com metade da largura: alvo fácil para o polegar sem empilhar */}
            <div className="mt-10 grid gap-2 min-[360px]:grid-cols-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
              <ButtonLink
                href={site.linkedin}
                variant="dark"
                size="lg"
                className="min-w-0 justify-between pl-5 sm:pl-7"
              >
                LinkedIn
              </ButtonLink>
              <ButtonLink
                href={site.github}
                variant="ink-ghost"
                size="lg"
                className="min-w-0 justify-between pl-5 sm:pl-7"
              >
                GitHub
              </ButtonLink>
              {site.resume && (
                <ButtonLink
                  href={site.resume}
                  variant="ink-ghost"
                  size="lg"
                  icon="none"
                  external={false}
                  download
                  className="justify-center min-[360px]:col-span-2"
                >
                  Baixar currículo
                </ButtonLink>
              )}
            </div>
          </div>
        </div>

        {/* Rodapé da página: espelha o cabeçalho e "vira a folha" para o contato */}
        <div className="border-ink/15 mt-24 flex items-center justify-between gap-6 border-t pt-5 sm:mt-28 lg:mt-32">
          <p className="text-label text-ink-muted">
            {site.url.replace(/^https?:\/\//, "")}
          </p>
          <NextPage />
        </div>
      </div>
    </section>
  )
}
