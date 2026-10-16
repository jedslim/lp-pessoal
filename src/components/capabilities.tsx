import { CapabilitiesScroller } from "@/components/capabilities-scroller"
import { SectionLabel } from "@/components/kit/section-label"
import { SplitLines } from "@/components/kit/split-lines"

/**
 * Capacidades (#capacidades): quatro frentes, cada uma com um playground de
 * verdade (redimensionar um site, editar no WordPress, ver uma integração
 * acontecer, revisar o trabalho de uma IA). No desktop a seção fica presa no
 * scroll e as frentes se revezam; no celular, empilham.
 */
export function Capabilities() {
  return (
    <section
      id="capacidades"
      aria-label="Capacidades"
      className="relative py-20 sm:py-28 lg:py-40"
    >
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <SectionLabel label="Capacidades" />

        {/* A mesma grade de abertura de Trabalho: título nas colunas 1–8,
            apoio nas 9–12, assentado na linha de base da última linha */}
        <div className="mt-10 lg:mt-14 xl:grid xl:grid-cols-12 xl:gap-x-6">
          <SplitLines
            as="h2"
            lines={[
              "Uma pessoa.",
              // Função não atravessa a fronteira servidor → cliente: a cor vai no conteúdo
              <span key="l2" className="text-muted-foreground">
                A stack inteira<span className="text-red-light">.</span>
              </span>,
            ]}
            className="text-display text-h2 xl:col-span-8 xl:whitespace-nowrap"
          />
          <p className="text-muted-foreground mt-8 max-w-[34ch] text-base leading-relaxed text-pretty sm:text-lg lg:mt-6 lg:ml-auto xl:col-span-4 xl:col-start-9 xl:mt-0 xl:self-end xl:justify-self-end xl:pb-h2-base">
            Você traz o problema. Eu escolho a ferramenta certa para ele e
            coloco no ar. Teste cada frente aqui mesmo.
          </p>
        </div>

        <CapabilitiesScroller />
      </div>
    </section>
  )
}
