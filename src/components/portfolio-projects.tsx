import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"
import type { Project as TileProject } from "@/components/project-card"
import { ProjectsCarousel } from "@/components/projects-carousel"
import { ProjectsMarquee } from "@/components/projects-marquee"
import { projects } from "@/lib/projects"

/** Os projetos do site no formato da faixa (o card da 1ª versão). */
const tiles: TileProject[] = projects.map((p) => ({
  name: p.name,
  segment: p.segment,
  description: p.description,
  tags: p.tags,
  image: p.image,
  preview: {
    url: p.url ?? `https://${p.host}/`,
    video: { webm: p.video.webm, mp4: p.video.mp4 },
  },
  url: p.url,
  agency: p.agency,
}))

/**
 * Projetos do portfólio: a faixa contínua da primeira versão do site. Os
 * cards passam devagar da direita para a esquerda; no hover (ou no toque) o
 * card cresce e o vídeo do site começa. No celular vira um carrossel com
 * setas e o card do meio toca sozinho.
 */
export function PortfolioProjects() {
  return (
    <section
      id="projetos"
      aria-label="Projetos"
      className="relative py-20 sm:py-24 lg:py-32"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-12">
          <div>
            <SectionLabel label="Projetos" />
            <SplitLines
              as="h2"
              lines={[
                "Projetos",
                <span key="l2" className="text-muted-foreground">
                  no ar<span className="text-red-light">.</span>
                </span>,
              ]}
              className="text-display text-h2 mt-8 lg:mt-10"
            />
          </div>
          <p className="text-muted-foreground mt-8 max-w-[30ch] text-base leading-relaxed text-pretty sm:text-lg lg:mt-0 lg:pb-h2-base lg:text-right">
            Uma seleção dos mais de 80 que já coloquei no ar.{" "}
            <span className="hidden md:inline">
              Passe o mouse num projeto para ver o site rodando.
            </span>
          </p>
        </div>
      </div>

      {/* Desktop e tablet: faixa contínua. Celular: carrossel com setas */}
      <div className="mt-12 hidden md:block lg:mt-16">
        <ProjectsMarquee projects={tiles} />
      </div>
      <div className="mt-10 md:hidden">
        <ProjectsCarousel projects={tiles} />
      </div>
    </section>
  )
}
