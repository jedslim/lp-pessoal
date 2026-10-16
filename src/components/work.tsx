import { Fragment } from "react"
import { projects } from "@/lib/projects"
import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import { WorkCards } from "@/components/work-cards"
import { WorkFeatured } from "@/components/work-featured"
import { WorkIndex } from "@/components/work-index"
import { OnAirDot } from "@/components/work-on-air"

/**
 * Trabalho (#trabalho): o showcase do site. Um destaque grande com o site
 * rodando numa moldura de navegador e, abaixo, o índice editorial com os
 * outros projetos. Desktop com mouse vê o índice com prévia no cursor;
 * celular e toque veem cards (o mesmo conteúdo, sem depender de hover).
 */
export function Work() {
  const featured = projects.find((p) => p.featured) ?? projects[0]
  const rest = projects.filter((p) => p !== featured)
  const total = projects.length

  return (
    // O nome da região é o próprio H2 (as duas linhas do SplitLines)
    <section
      id="trabalho"
      aria-labelledby="trabalho-t1 trabalho-t2"
      className="relative py-20 sm:py-28 lg:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Cabeçalho: a mesma grade de abertura de Capacidades (título nas
            colunas 1–8, apoio nas 9–12 apoiado na última linha do título) */}
        <header className="grid gap-y-10 lg:grid-cols-12 lg:items-end lg:gap-x-6">
          <SectionLabel
            index="01"
            label="Trabalho selecionado"
            className="lg:col-span-12"
          />
          <SplitLines
            as="h2"
            className="text-display text-h2 whitespace-nowrap lg:col-span-8"
            // Elementos atravessam para o cliente: cada linha precisa de key
            lines={[
              <span key="l1" id="trabalho-t1">
                Trabalho que
              </span>,
              <Fragment key="l2">
                {/* O ponto final é a luz de "no ar" */}
                <span id="trabalho-t2">
                  está no ar<span className="sr-only">.</span>
                </span>
                <OnAirDot />
              </Fragment>,
            ]}
          />
          <div className="lg:col-span-4 lg:self-end lg:justify-self-end lg:pb-h2-base xl:col-start-9">
            <p className="max-w-[34ch] text-base leading-relaxed text-balance text-muted-foreground sm:text-lg">
              <span className="text-foreground">
                10 projetos entre os 80+ que já coloquei em produção.
              </span>
              <span className="hidden lg:pointer-fine:inline">
                {" "}
                Passe o mouse para ver cada um rodando.
              </span>
            </p>
          </div>
        </header>

        {/* Destaque */}
        <div className="mt-14 md:mt-20 lg:mt-28">
          <WorkFeatured project={featured} />
        </div>

        {/* Índice. No lg, ~120px abaixo da legenda da figura */}
        <div className="mt-16 md:mt-28 lg:mt-20 2xl:mt-[4.5rem]">
          <div className="text-label mb-10 flex items-center gap-4 text-muted-foreground lg:mb-12">
            <span className="text-red-light">Índice</span>
            <span aria-hidden className="h-px flex-1 bg-border" />
            <span className="tabular-nums">
              02–{String(total).padStart(2, "0")}
            </span>
          </div>

          {/* Desktop com mouse: índice com prévia no cursor */}
          <div className="hidden lg:pointer-fine:block">
            <WorkIndex projects={rest} start={2} total={total} />
          </div>
          {/* Toque e telas menores: cards */}
          <div className="lg:pointer-fine:hidden">
            <WorkCards projects={rest} start={2} total={total} />
          </div>
        </div>
      </div>
    </section>
  )
}
