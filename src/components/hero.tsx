"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react"
import { HeroCtas } from "@/components/hero-ctas"
import { HeroKeys } from "@/components/hero-keys"
import { HeroName } from "@/components/hero-name"
import { HeroScene } from "@/components/hero-scene"
import { HeroStats } from "@/components/hero-stats"
import { cn } from "@/lib/utils"

/*
 * HERO: capa de revista com o nome.
 *
 * O H1 é o nome em duas linhas, em fio (Archivo expandida, peso 150, que
 * engorda até 900 perto do cursor), que abraçam o retrato numa escada:
 * "Jedson" puxa para a esquerda e só a ponta do "n" encosta no cabelo;
 * "Santos" desce e anda para a direita, NA FRENTE do peito. As duas linhas se prendem ao centro da cabeça, não às bordas da
 * tela: a escada fica igual em qualquer largura. O rosto nunca recebe texto.
 * À esquerda do rosto, abaixo de "Jedson", fica o "bolso" com subtítulo,
 * CTAs e o status.
 *
 * Toda a composição mede em `em` (`text-[...]` no wrapper): foto, glow,
 * teclas e cena 3D escalam juntos. O nome usa uma fração dessa medida
 * (0.68em no desktop): é ~30% menor que a escala do retrato. Os números da
 * silhueta saem do alfa do WebP: cabeça centrada em 49% da largura, no topo
 * da foto (o cabelo começa na 1ª linha), queixo em 36,5% da altura
 * (altura = 1.21 × largura).
 *
 * Geometria do desktop (em da composição, x a partir do centro):
 *   retrato   4.75em de largura, em 50% - 2.13em, topo 0.36em
 *   cabeça    centro em (+0.2em, 1.4em), meia-largura 0.69em
 *   "Jedson"  termina em ~0em (a ponta do "n" no cabelo), base 0.53em
 *   "Santos"  começa em +0.34em, topo em ~2.7em (bem abaixo do queixo)
 *   bolso     de 0 até 50% - 0.84em, a partir de 0.62em + 64px
 *   números   o trilho de baixo sobe 48px a partir do fim da 1ª dobra
 *
 * Camadas (z-index no contexto da <section>, que tem `isolate`):
 *   z-0   grid de fundo
 *   z-10  glow vermelho
 *   z-12  <HeroScene /> (teclas 3D em WebGL, a section inteira)
 *   z-20  linha 1 do H1 ("Jedson")
 *   z-30  foto
 *   z-40  linha 2 do H1 ("Santos")
 *   z-50  textos e controles (subtítulo, CTAs, números)
 *
 * CENA 3D (<HeroScene />, desktop): canvas em toda a section, atrás da foto
 * e das duas linhas do nome. As teclas se posicionam em `em` a partir do
 * centro da cabeça (medido em `[data-hero-portrait]`); posições e saídas
 * no scroll em hero-scene-layout.ts. Zonas livres para as teclas: o canto
 * superior esquerdo (antes do "J"), a direita da cabeça (acima de "Santos")
 * e o canto inferior esquerdo, sob os CTAs (a tecla ↵ fica a 150px ou mais
 * deles, medidos em `[data-hero-ctas]`, sem descer até os números,
 * `[data-hero-rail]`). Abaixo do lg (e no toque, e com reduced motion) não
 * há WebGL: entra o <HeroKeys />.
 * O canvas não recebe ponteiro: a cena ouve a <section> e faz o raycast
 * sozinha (ignora o que estiver sob links e botões).
 *
 * TECLAS EM IMAGEM (<HeroKeys />, fallback do celular e de reduced motion):
 * container `absolute inset-0` na composição, SEM z-index, opacity, transform
 * ou filter na raiz (senão vira contexto próprio e as teclas não intercalam
 * com as camadas). Cada tecla escolhe o próprio z (hero-keys.tsx).
 *
 * Interação: o nome engorda perto do cursor e quando a pessoa digita uma
 * letra dele; as teclas afundam no hover, fazem uma graça sorteada no
 * clique (afundar, pular, quicar, tremer, peteleco) e reagem à digitação de
 * verdade; o cursor 3D da cena olha para o ponteiro e aperta teclas; os CTAs são magnéticos e mostram para onde levam;
 * os números ganham peso e recontam no hover.
 */

/** Quanto cada camada anda com o mouse (px por unidade de --hero-mx/my). */
const SHIFT = "transition-[translate] duration-[1100ms] ease-out-expo"
const DEPTH = {
  glow: `${SHIFT} translate-x-[calc(var(--hero-mx,0)*-18px)] translate-y-[calc(var(--hero-my,0)*-10px)]`,
  back: `${SHIFT} translate-x-[calc(var(--hero-mx,0)*-9px)] translate-y-[calc(var(--hero-my,0)*-5px)]`,
  photo: `${SHIFT} translate-x-[calc(var(--hero-mx,0)*4px)]`,
  front: `${SHIFT} translate-x-[calc(var(--hero-mx,0)*14px)] translate-y-[calc(var(--hero-my,0)*5px)]`,
}

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const reduce = useReducedMotion()

  // Parallax ao sair da tela: a foto sobe um pouco mais rápido que o texto
  // (afasta o rosto da linha 2) e o glow fica para trás
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  })
  const photoY = useTransform(scrollYProgress, [0, 1], ["0%", "-7%"])
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "7%"])

  // Profundidade com o mouse: grava --hero-mx/--hero-my (-1 a 1) na section e
  // cada camada anda um pouco (CSS `translate` com transição). Linha 1 e
  // glow vão contra o cursor, linha 2 a favor: o retrato fica "entre" elas.
  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Fora da tela, `data-paused` congela os loops em CSS da hero (ping do
    // status, indicador de scroll, flutuação das teclas)
    let visible = true
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      el.toggleAttribute("data-paused", !visible)
    })
    io.observe(el)

    const fine = window.matchMedia("(pointer: fine)").matches
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (!fine || still) return () => io.disconnect()

    let frame = 0
    let px = 0
    let py = 0
    const onMove = (e: PointerEvent) => {
      px = e.clientX
      py = e.clientY
      if (!visible || frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const mx = (px / window.innerWidth) * 2 - 1
        const my = (py / window.innerHeight) * 2 - 1
        el.style.setProperty("--hero-mx", mx.toFixed(3))
        el.style.setProperty("--hero-my", my.toFixed(3))
      })
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      io.disconnect()
      window.removeEventListener("pointermove", onMove)
    }
  }, [])

  return (
    <section
      ref={ref}
      aria-label="Apresentação"
      className="relative isolate overflow-hidden [&[data-paused]_*]:[animation-play-state:paused]"
    >
      {/* Papel milimetrado, só ao redor do retrato */}
      <div
        aria-hidden
        className="bg-grid pointer-events-none absolute inset-0 z-0 [mask-image:radial-gradient(ellipse_90%_45%_at_50%_30%,black,transparent_75%)] lg:[mask-image:radial-gradient(ellipse_60%_56%_at_53%_40%,black,transparent_75%)]"
      />

      {/* Teclas 3D (WebGL): a section inteira, para espalharem no scroll */}
      <HeroScene className="pointer-events-none absolute inset-0 z-[12]" />

      <div className="relative mx-auto flex min-h-svh max-w-[1440px] flex-col px-5 pt-[5.75rem] pb-8 sm:px-8 lg:px-12 lg:pt-24 lg:pb-[4.75rem]">
        {/* Composição: tudo aqui dentro mede em `em`. No desktop a medida
            também respeita a altura da tela (a capa cabe inteira na 1ª
            dobra, com os números) */}
        <div className="relative text-[min(20.4vw,10.6svh)] sm:text-[min(17vw,10.6svh)] lg:text-[clamp(3.2rem,min(11.5vw,calc((100svh_-_280px)/3.2)),12rem)]">
          {/* Um glow só, atrás da cabeça */}
          <motion.div
            aria-hidden
            style={{ y: reduce ? 0 : glowY }}
            className={cn("pointer-events-none absolute inset-0 z-10", DEPTH.glow)}
          >
            <div className="absolute top-[-2.6em] left-[calc(50%-4.6em)] size-[9.2em] rounded-full bg-[radial-gradient(closest-side,rgb(229_9_20/0.34),rgb(133_8_14/0.16)_45%,rgb(72_6_9/0.06)_70%,transparent)] lg:top-[-2.95em] lg:left-[calc(50%-4.3em)] lg:size-[9em]" />
          </motion.div>

          {/* Teclas em imagem (celular, reduced motion, sem WebGL) */}
          <HeroKeys className="pointer-events-none absolute inset-0" />

          {/* Retrato (LCP): sem opacity 0, entra só com transform em CSS.
              `data-hero-portrait`: a cena 3D mede a cabeça por aqui */}
          <motion.div
            data-hero-portrait
            style={{ y: reduce ? 0 : photoY }}
            className={cn(
              "pointer-events-none absolute top-[0.55em] left-[calc(50%-2.7em)] z-30 w-[5.5em] lg:top-[0.36em] lg:left-[calc(50%-2.13em)] lg:w-[4.75em]",
              DEPTH.photo,
            )}
          >
            <div className="animate-in slide-in-from-bottom-10 zoom-in-[1.04] origin-bottom duration-[1400ms] ease-out-expo motion-reduce:animate-none">
              <Image
                src="/jed-foto-hd.webp"
                alt="Jedson Santos, de camiseta preta, olhando para a câmera"
                width={2244}
                height={2716}
                // LCP: prioridade alta e sem lazy, no próprio <img> (a doc do
                // Next 16 recomenda isto no lugar de `preload`)
                fetchPriority="high"
                loading="eager"
                // Foto em alta (upscale 2x): qualidade 90 para a pele e a barba
                quality={90}
                // Desktop: 4.75em com em = 11.5vw (até 12rem): 55vw, no
                // máximo ~912px. Celular: 5.5em com em = 20.4vw (112vw)
                sizes="(min-width: 1670px) 912px, (min-width: 1024px) 55vw, 112vw"
                className="h-auto w-full select-none [mask-image:linear-gradient(to_bottom,black_44%,transparent_76%)] lg:[mask-image:linear-gradient(to_bottom,black_47%,transparent_75%)]"
                draggable={false}
              />
            </div>
          </motion.div>

          {/* O nome. A máscara de cada linha soma 0.12em entre elas: o mt da
              linha 2 já desconta. No desktop as linhas se prendem ao centro
              da cabeça (+0.2em da composição = +0.29em do nome): "Jedson"
              termina 0.28em depois dele (o "n" some atrás do cabelo),
              "Santos" começa 0.22em antes */}
          <HeroName
            label="Jedson Santos"
            delay={0.08}
            className="text-display text-[1em] tracking-[-0.03em] lg:text-[0.68em]"
            lines={[
              {
                text: "Jedson",
                className: cn(
                  // -ml: a perna do J tem respiro; o "ink" encosta na margem
                  "relative z-20 -ml-[0.02em] text-left sm:ml-0 sm:text-center lg:ml-0 lg:pr-[calc(50%+0.02em)] lg:text-right",
                  DEPTH.back,
                ),
              },
              {
                text: "Santos",
                className: cn(
                  "relative z-40 mt-[2.08em] text-right sm:text-center lg:mt-[3.12em] lg:pl-[calc(50%+0.5em)] lg:text-left",
                  DEPTH.front,
                ),
              },
            ]}
          />

          {/* Bolso abaixo de "Jedson", à esquerda do rosto (desktop); no
              celular, logo abaixo do nome. A largura para antes da orelha
              (50% - 0.84em) */}
          <div className="relative z-50 mt-[0.42em] sm:mx-auto sm:max-w-[34rem] sm:text-center lg:absolute lg:top-[0.62em] lg:left-0 lg:mx-0 lg:mt-0 lg:w-[calc(50%-0.84em)] lg:max-w-[33rem] lg:pt-16 lg:text-left">
            <Pitch />
          </div>
        </div>

        <BottomRail />
      </div>
    </section>
  )
}

/* ---------- Bolso: subtítulo + CTAs ---------- */

function Pitch() {
  return (
    <div className="text-base">
      {/* O cargo abre a frase, em destaque */}
      <p className="text-muted-foreground max-w-[30rem] text-[15px] leading-[1.6] text-pretty sm:mx-auto sm:text-base lg:mx-0 lg:text-[16px] lg:text-balance xl:text-[17px]">
        <span className="text-foreground">Desenvolvedor full stack.</span> Há
        mais de 4 anos coloco no ar sites, sistemas e automações com Next.js,
        React, WordPress e IA aplicada.
      </p>

      {/* Aparecem de cara: nada de entrada animada nos botões */}
      <HeroCtas className="mt-7 xl:mt-8" />
    </div>
  )
}

/* ---------- Embaixo: números + indicador de scroll ---------- */

function BottomRail() {
  return (
    // `data-hero-rail`: a tecla ↵ da cena 3D não desce até aqui
    <div data-hero-rail className="relative z-50 mt-auto flex items-end justify-between gap-6 pt-12 lg:pt-8">
      <HeroStats className="sm:mx-auto lg:mx-0" />

      {/* Indicador de scroll */}
      <div
        aria-hidden
        className="animate-in fade-in text-label text-muted-foreground hidden shrink-0 flex-col items-center gap-3 duration-1000 fill-mode-both delay-1000 motion-reduce:animate-none lg:flex"
      >
        {/* "Desça", não "Role": ao lado do cargo, "role" se lê em inglês */}
        <span className="[writing-mode:vertical-rl]">Desça</span>
        <span className="relative h-14 w-px overflow-hidden bg-white/10">
          <span className="animate-scroll-cue bg-red-light absolute inset-0 motion-reduce:animate-none" />
        </span>
      </div>
    </div>
  )
}
