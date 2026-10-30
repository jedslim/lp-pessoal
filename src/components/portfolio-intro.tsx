import { ButtonLink } from "@/components/kit/button-link"
import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import { site } from "@/lib/site"

/**
 * Abertura do /portfolio: o lado técnico (para quem avalia o trabalho, não
 * para quem contrata um site). Título, uma linha de contexto e os perfis.
 */
export function PortfolioIntro() {
  return (
    <section
      aria-label="Portfólio"
      className="relative pt-36 pb-12 sm:pt-44 sm:pb-16 lg:pt-52 lg:pb-20"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <SectionLabel label="Portfólio" />
        <div className="mt-10 lg:mt-14 xl:grid xl:grid-cols-12 xl:gap-x-6">
          <SplitLines
            as="h1"
            lines={[
              "Como eu",
              <span key="l2" className="text-muted-foreground">
                construo<span className="text-red-light">.</span>
              </span>,
            ]}
            className="text-display text-h2 xl:col-span-7"
          />
          <div className="mt-8 xl:col-span-5 xl:col-start-8 xl:mt-0 xl:self-end xl:pb-h2-base">
            <p className="text-muted-foreground max-w-[40ch] text-base leading-relaxed text-pretty sm:text-lg">
              <span className="text-foreground">
                {site.name}, desenvolvedor full stack há mais de 4 anos.
              </span>{" "}
              Aqui está o lado técnico: as ferramentas do dia a dia, o que eu
              faço com cada uma e os projetos que coloquei no ar.
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
          </div>
        </div>
      </div>
    </section>
  )
}
