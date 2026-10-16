"use client"

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type RefObject,
} from "react"
import Image from "next/image"
import {
  motion,
  useInView,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react"
import { useScramble } from "@/components/chrome-scramble"
import { cn } from "@/lib/utils"

/** Mola do ponteiro: segue rápido e assenta sem quicar. */
const SPRING = { stiffness: 140, damping: 20, mass: 0.6 }
/** Inclinação máxima (graus) e quanto cada camada anda (px). */
const TILT = 6
const DEPTH = { block: 5, photo: 10 }

/** Marcas de corte de gráfica, para fora dos cantos do bloco. */
function CropMarks() {
  const line = "bg-ink/45 absolute"
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0">
      {/* Superior esquerdo */}
      <span className={cn(line, "top-0 -left-4 h-px w-2.5 sm:-left-5 sm:w-3 lg:-left-7 lg:w-4")} />
      <span className={cn(line, "-top-4 left-0 h-2.5 w-px sm:-top-5 sm:h-3 lg:-top-7 lg:h-4")} />
      {/* Superior direito */}
      <span className={cn(line, "top-0 -right-4 h-px w-2.5 sm:-right-5 sm:w-3 lg:-right-7 lg:w-4")} />
      <span className={cn(line, "-top-4 right-0 h-2.5 w-px sm:-top-5 sm:h-3 lg:-top-7 lg:h-4")} />
      {/* Inferior esquerdo */}
      <span className={cn(line, "bottom-0 -left-4 h-px w-2.5 sm:-left-5 sm:w-3 lg:-left-7 lg:w-4")} />
      <span className={cn(line, "-bottom-4 left-0 h-2.5 w-px sm:-bottom-5 sm:h-3 lg:-bottom-7 lg:h-4")} />
      {/* Inferior direito */}
      <span className={cn(line, "-right-4 bottom-0 h-px w-2.5 sm:-right-5 sm:w-3 lg:-right-7 lg:w-4")} />
      <span className={cn(line, "right-0 -bottom-4 h-2.5 w-px sm:-bottom-5 sm:h-3 lg:-bottom-7 lg:h-4")} />
    </span>
  )
}

/**
 * Régua vertical dentro do bloco: traço a cada 4%, número a cada 20%.
 * Com o mouse, uma marca vermelha mostra a altura do cursor, como a régua
 * de um editor de imagem.
 */
function Ruler({
  rulerRef,
  top,
  value,
  opacity,
}: {
  rulerRef: RefObject<HTMLSpanElement | null>
  top: MotionValue<string>
  value: MotionValue<string>
  opacity: MotionValue<number>
}) {
  return (
    <span
      ref={rulerRef}
      aria-hidden
      className="text-bone/35 pointer-events-none absolute top-4 bottom-4 left-4 w-6 font-mono text-[9px] leading-none"
    >
      <span className="absolute inset-y-0 left-0 w-1.5 bg-[repeating-linear-gradient(to_bottom,currentColor_0_1px,transparent_1px_4%)]" />
      <span className="absolute inset-y-0 left-0 w-3 bg-[repeating-linear-gradient(to_bottom,currentColor_0_1px,transparent_1px_20%)]" />
      {[0, 1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className="absolute left-4 -translate-y-1/2"
          style={{ top: `${n * 20}%` }}
        >
          {n}
        </span>
      ))}
      {/* Marca do cursor: traço sobre os ticks e a leitura depois dos números */}
      <motion.span
        className="absolute left-0 flex -translate-y-1/2 items-center"
        style={{ top, opacity }}
      >
        <span className="bg-red-light h-px w-3 shadow-[0_0_8px_rgb(255_52_59/0.8)]" />
        <motion.span className="text-red-light ml-5 tabular-nums">
          {value}
        </motion.span>
      </motion.span>
    </span>
  )
}

/** "P&B" ↔ "COR": o modo da foto, trocando com o embaralhado do menu. */
function ModeLabel({ color }: { color: boolean }) {
  const reduce = useReducedMotion()
  const label = color ? "COR" : "P&B"
  const [text, play] = useScramble(label)
  const prev = useRef(label)
  useEffect(() => {
    if (prev.current === label) return
    prev.current = label
    play()
  }, [label, play])
  // Com reduced motion o embaralhado não roda: mostra o rótulo direto
  return <>{reduce ? label : text}</>
}

/**
 * Retrato em composição de revista: bloco ink com régua e marcas de corte,
 * a cabeça saindo pelo topo. No scroll, a foto "sobe" de dentro do bloco e
 * a peça se levanta (perspectiva). Com o mouse, ela inclina na direção do
 * cursor e as camadas se separam em profundidade: a foto anda mais que o
 * bloco, a luz de estúdio escorrega junto e a régua marca a altura.
 */
export function AboutFigure({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLSpanElement>(null)
  const reduce = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "center 0.55"],
  })
  const rise = useTransform(scrollYProgress, [0, 1], ["9%", "0%"])
  // Entra deitada para trás e fica de pé (vale também no toque)
  const lift = useTransform(scrollYProgress, [0, 1], [9, 0])

  // Ponteiro de -1 a 1 (centro = 0), suavizado com mola
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const sx = useSpring(px, SPRING)
  const sy = useSpring(py, SPRING)
  const rotateY = useTransform(sx, (v) => v * TILT)
  const rotateX = useTransform(() => lift.get() - sy.get() * TILT * 0.7)
  // O bloco recua um pouco; a foto (na frente) anda para o lado do cursor
  const blockX = useTransform(sx, (v) => v * -DEPTH.block)
  const blockY = useTransform(sy, (v) => v * -DEPTH.block * 0.6)
  const photoX = useTransform(sx, (v) => v * (DEPTH.photo + DEPTH.block))
  const photoY = useTransform(sy, (v) => v * (DEPTH.photo + DEPTH.block) * 0.6)
  const lightX = useTransform(sx, (v) => `${50 + v * 28}%`)
  const light = useMotionTemplate`radial-gradient(60% 70% at ${lightX} 0%, #2a2a2f, transparent 75%)`

  // Régua: posição (0 a 1) e visibilidade da marca do cursor
  const mark = useMotionValue(0)
  const markOn = useMotionValue(0)
  const markOpacity = useSpring(markOn, { stiffness: 320, damping: 32 })
  const markTop = useTransform(mark, (v) => `${v * 100}%`)
  const markValue = useTransform(mark, (v) => (v * 5).toFixed(1))

  // Sem mouse não há hover: a cor entra quando o retrato chega ao meio da tela
  const centered = useInView(ref, { margin: "-30% 0px -30% 0px" })
  const [touch, setTouch] = useState(false)
  const [hover, setHover] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(hover: none)")
    const sync = () => setTouch(mq.matches)
    sync()
    mq.addEventListener("change", sync)
    return () => mq.removeEventListener("change", sync)
  }, [])
  const color = hover || (touch && centered)

  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse" || reduce) return
    const box = ref.current?.getBoundingClientRect()
    if (!box) return
    const clamp = (v: number) => Math.max(-1, Math.min(1, v))
    px.set(clamp(((e.clientX - box.left) / box.width) * 2 - 1))
    py.set(clamp(((e.clientY - box.top) / box.height) * 2 - 1))
    const r = rulerRef.current?.getBoundingClientRect()
    if (!r) return
    const t = (e.clientY - r.top) / r.height
    markOn.set(t >= 0 && t <= 1 ? 1 : 0)
    mark.set(Math.max(0, Math.min(1, t)))
  }
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return
    setHover(false)
    px.set(0)
    py.set(0)
    markOn.set(0)
  }

  return (
    <figure
      className={cn("group/fig relative", className)}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {/* Peça inclinável. Reduced motion no CSS (vence o estilo inline):
          o HTML do servidor e o do cliente ficam iguais */}
      <motion.div
        ref={ref}
        style={{ rotateX, rotateY, transformPerspective: 1100 }}
        className="relative aspect-[100/106] will-change-transform motion-reduce:transform-none!"
      >
        {/* Camada de trás: bloco, marcas de corte e a máscara da foto */}
        <motion.div
          style={{ x: blockX, y: blockY }}
          className="absolute inset-0 motion-reduce:transform-none!"
        >
          {/* Bloco ink: do pescoço para baixo */}
          <div className="absolute inset-x-0 top-[35%] bottom-0">
            <div className="bg-ink absolute inset-0 overflow-hidden rounded-[3px]">
              {/* Luz de estúdio, neutra: a silhueta da camiseta se lê no preto */}
              <motion.div
                style={{ backgroundImage: light }}
                className="absolute inset-0"
              />
              <Ruler
                rulerRef={rulerRef}
                top={markTop}
                value={markValue}
                opacity={markOpacity}
              />
              <span
                aria-hidden
                className="text-label text-bone/45 absolute top-4 right-4"
              >
                <ModeLabel color={color} />
              </span>
            </div>
            <CropMarks />
          </div>

          {/* Foto: o corte é só na base do bloco; o topo fica livre */}
          <div className="absolute inset-x-0 -top-[25%] bottom-0 overflow-hidden">
            {/* Camada da frente: anda mais que o bloco. Sobra 12px embaixo
                (-bottom-3), então o deslocamento nunca abre vão na base */}
            <motion.div
              style={{ x: photoX, y: photoY }}
              className="absolute inset-x-[7%] -bottom-3 motion-reduce:transform-none!"
            >
              <motion.div
                style={{ y: rise }}
                className="will-change-transform motion-reduce:transform-none!"
              >
                <Image
                  src="/jed-foto-hd.webp"
                  alt="Retrato de Jedson Santos, de camiseta preta, olhando para a câmera"
                  width={2244}
                  height={2716}
                  sizes="(min-width: 1024px) 36vw, 86vw"
                  className={cn(
                    // P&B de revista; a cor volta no hover (ou no centro da tela, no toque)
                    "h-auto w-full contrast-[1.05] grayscale transition-[filter] duration-700 ease-out group-hover/fig:grayscale-0",
                    touch && centered && "grayscale-0",
                  )}
                />
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>

      <figcaption className="border-ink/15 text-ink-muted mt-10 flex items-baseline justify-between gap-4 border-t pt-3 text-sm lg:mt-12">
        <span>
          {/* Cada figura leva o número da sua seção (01 Trabalho, 03 Stack) */}
          <span className="text-label text-[#c1070f]">fig. 05</span>
          <span aria-hidden className="text-ink/30 mx-2">
            /
          </span>
          Jedson Santos, dev full stack
        </span>
        <span className="text-label shrink-0">
          Brasil<span className="hidden sm:inline"> · UTC−3</span>
        </span>
      </figcaption>
    </figure>
  )
}
