import { HeroStats } from "@/components/hero-stats"
import { ButtonLink } from "@/components/kit/button-link"
import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import { PortfolioEditor } from "@/components/portfolio-editor"
import { site } from "@/lib/site"
import { stack } from "@/lib/stack"

/** Números do portfólio: só o que dá para conferir no próprio site. */
const numbers = [
  { value: 80, label: ["projetos", "no ar"] },
  { value: 4, label: ["anos em", "produção"] },
  { value: stack.length, label: ["ferramentas", "na stack"], plus: false },
] as const

/**
 * Abertura do /portfolio: o lado técnico (para quem avalia o trabalho, não
 * para quem contrata um site). À esquerda o título, o contexto e os números;
 * à direita o perfil em código, digitado ao entrar.
 */
export function PortfolioIntro() {
  return (
    <section
      aria-label="Portfólio"
      className="relative pt-32 pb-16 sm:pt-40 lg:pt-36 lg:pb-24"
    >
      {/* Papel milimetrado sumindo para baixo, atrás da abertura */}
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 -z-10 [mask-image:radial-gradient(90%_70%_at_70%_30%,black,transparent)]"
      />
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-y-14 lg:grid-cols-12 lg:gap-x-12">
          <div className="lg:col-span-6">
            <SectionLabel label="Portfólio" />
            <SplitLines
              as="h1"
              lines={[
                "Como eu",
                <span key="l2" className="text-muted-foreground">
                  construo<span className="text-red-light">.</span>
                </span>,
              ]}
              className="text-display text-h2 mt-8 lg:mt-10"
            />
            <p className="text-muted-foreground mt-8 max-w-[42ch] text-base leading-relaxed text-pretty sm:text-lg">
              <span className="text-foreground">
                {site.name}, desenvolvedor full stack há mais de 4 anos.
              </span>{" "}
              Aqui está o lado técnico: os projetos que coloquei no ar, o que eu
              faço em cada frente e as ferramentas do dia a dia.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={site.linkedin} variant="light">
                LinkedIn
              </ButtonLink>
              <ButtonLink href={site.github} variant="ghost">
                GitHub
              </ButtonLink>
              {site.resume && (
                <ButtonLink
                  href={site.resume}
                  variant="ghost"
                  icon="none"
                  external={false}
                  download
                >
                  Baixar currículo
                </ButtonLink>
              )}
            </div>
            <HeroStats
              items={numbers}
              className="mt-12 grid grid-cols-3 gap-x-4 gap-y-8 border-t border-white/[0.08] pt-10 sm:gap-x-8 lg:mt-14 lg:gap-x-6"
            />
          </div>

          <PortfolioEditor className="lg:col-span-6" />
        </div>
      </div>
    </section>
  )
}
