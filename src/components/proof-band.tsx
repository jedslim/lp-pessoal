"use client"

import { useEffect, useRef } from "react"
import { Marquee } from "@/components/kit/marquee"

/** O que eu entrego (a ordem vai do site ao agente). */
const services = [
  "Sites institucionais",
  "Landing pages",
  "Sistemas web",
  "WordPress headless",
  "Integrações e APIs",
  "Automação com n8n",
  "Agentes de IA",
]

/**
 * Faixa logo abaixo da hero: o que eu faço, em display.
 * Os itens ficam leves e em cinza, e no hover acendem e ganham peso
 * (wght 300 → 800 da Archivo), como o nome da hero. A largura do peso 800
 * fica reservada por um "fantasma" em ::before, então a faixa não sacode.
 * Separador: quadradinho vermelho. Sem numeração.
 *
 * O rótulo fica no grid do site (alinhado com o resto da página) e a trilha
 * sangra até a borda direita da tela, com fade só nos últimos 80px. Em
 * telas largas a coluna do rótulo cresce o que sobra do container
 * ((100% - 1440px) / 2), assim o texto dele cai na mesma coluna do conteúdo.
 */
export function ProofBand() {
  const ref = useRef<HTMLElement>(null)

  // Fora da tela a faixa para de andar (`data-paused` pausa a animação CSS)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) =>
      el.toggleAttribute("data-paused", !e.isIntersecting),
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      aria-labelledby="faixa-titulo"
      className="border-border relative border-y [&[data-paused]_.animate-marquee]:[animation-play-state:paused]"
    >
      <div className="flex flex-col gap-5 py-7 sm:gap-6 lg:flex-row lg:items-center lg:gap-0 lg:py-0">
        <h2
          id="faixa-titulo"
          className="text-label text-muted-foreground flex shrink-0 items-center gap-3 px-5 font-normal sm:px-8 lg:w-[calc(max(0px,(100%-1440px)/2)+19rem)] lg:self-stretch lg:border-r lg:border-border lg:py-9 lg:pr-8 lg:pl-[calc(max(0px,(100%-1440px)/2)+3rem)]"
        >
          <span aria-hidden className="bg-red-light block size-[7px] shrink-0" />
          <span>O que eu faço</span>
        </h2>

        {/* Sem o fade dos dois lados do Marquee: à esquerda a trilha some na
            borda da coluna do rótulo, à direita esmaece nos últimos 80px */}
        <Marquee
          duration={60}
          className="min-w-0 flex-1 [mask-image:linear-gradient(to_right,black_calc(100%-80px),transparent)]! lg:py-7"
        >
          <ul className="flex items-center">
            {services.map((name) => (
              <li key={name} className="flex items-center">
                <span className="group/item relative px-5 sm:px-7 lg:px-9">
                  {/* Largura reservada pelo fantasma (peso 800); o texto visível engorda
                      centrado dentro dela */}
                  <span
                    data-text={name}
                    className="text-display grid text-[clamp(1.75rem,7vw,2.25rem)] leading-none whitespace-nowrap before:invisible before:col-start-1 before:row-start-1 before:content-[attr(data-text)] lg:text-[clamp(2rem,3vw,3rem)]"
                  >
                    {/* Repouso em /56 (~#8b8b8b no fundo): legível, ainda
                        abaixo do branco do hover */}
                    <span className="text-foreground/56 group-hover/item:text-foreground col-start-1 row-start-1 justify-self-center transition-[color,font-variation-settings] duration-500 ease-out-expo [font-variation-settings:'wdth'_125,'wght'_300] group-hover/item:[font-variation-settings:'wdth'_125,'wght'_800] motion-reduce:transition-none">
                      {name}
                    </span>
                  </span>
                </span>
                <span aria-hidden className="bg-red-light/80 block size-[6px] shrink-0 lg:size-[7px]" />
              </li>
            ))}
          </ul>
        </Marquee>
      </div>
    </section>
  )
}
