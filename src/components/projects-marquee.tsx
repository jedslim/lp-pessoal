"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react"
import { createPortal } from "react-dom"
import {
  AnimatePresence,
  animate,
  motion,
  useAnimationFrame,
  useInView,
  useMotionValue,
  useReducedMotion,
} from "motion/react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ProjectTile, type Project } from "@/components/project-card"
import { cn } from "@/lib/utils"

/** Velocidade da faixa, em px por segundo. */
const SPEED = 22
/** A partir de quantos px de movimento um toque/clique vira arraste. */
const DRAG_THRESHOLD = 6
/** Fração da velocidade de inércia que sobra após 1s. */
const FRICTION = 0.04
/** Quão rápido a faixa acelera/desacelera ao parar ou voltar (maior = mais rápido). */
const EASING = 2.2
/** Tempo com o mouse parado sobre o card antes de ele crescer (ms). */
const HOVER_INTENT = 160
/** Tempo para o mouse sair da faixa sem fechar (ms). */
const LEAVE_GRACE = 120
/** Duração do deslize que leva um card ao centro (s). */
const GLIDE = 0.8

/**
 * Faixa contínua de projetos. Anda sozinha e pode ser arrastada (com inércia).
 * Com o mouse sobre ela, para e centraliza o card mais próximo do meio, que
 * cresce e mostra o site. Só o card do centro abre: as setas laterais e o
 * clique num card lateral deslizam o próximo até o centro.
 */
export function ProjectsMarquee({ projects }: { projects: Project[] }) {
  const reduceMotion = useReducedMotion()
  // "cópia-índice" do card ativo; as duas cópias da lista têm cards iguais
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const copyRef = useRef<HTMLUListElement>(null)
  const x = useMotionValue(0)
  const drag = useRef({
    offset: 0, // px andados (cresce para a esquerda)
    velocity: 0, // px/s, inércia após soltar
    down: false,
    dragging: false,
    justDragged: false,
    startX: 0,
    startOffset: 0,
    lastX: 0,
    lastT: 0,
    paused: false,
    gliding: false, // deslizando um card até o centro
    speed: 0, // velocidade atual, suavizada até o alvo
  })
  const glideRef = useRef<{ stop: () => void } | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  const activeRef = useRef<string | null>(null)
  useEffect(() => {
    drag.current.paused = activeKey !== null
    activeRef.current = activeKey
  }, [activeKey])

  // Começa com o primeiro projeto centralizado na tela
  const viewportRef = useRef<HTMLDivElement>(null)
  // Só anda quando está na tela (e não sai do centro antes de ser vista)
  const inView = useInView(viewportRef, { margin: "-20% 0px" })
  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const first = copyRef.current?.firstElementChild as HTMLElement | null
    if (!viewport || !first) return
    drag.current.offset = -(viewport.clientWidth - first.offsetWidth) / 2
  }, [])

  useAnimationFrame((_, delta) => {
    const s = drag.current
    const width = copyRef.current?.offsetWidth ?? 0
    if (!width) return
    const dt = Math.min(delta, 64) / 1000

    if (!s.dragging && !s.gliding) {
      if (Math.abs(s.velocity) > 4) {
        s.offset += s.velocity * dt
        s.velocity *= Math.pow(FRICTION, dt)
      } else {
        s.velocity = 0
        // Desacelera até parar no hover e acelera de volta ao sair
        const target =
          !s.paused && !s.gliding && inView && !reduceMotion ? SPEED : 0
        s.speed += (target - s.speed) * (1 - Math.exp(-dt * EASING))
        s.offset += s.speed * dt
      }
    }
    // Duas cópias: ao passar uma largura inteira, volta ao início sem emenda
    x.set(-(((s.offset % width) + width) % width))
  })

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    const s = drag.current
    Object.assign(s, {
      down: true,
      justDragged: false,
      startX: e.clientX,
      startOffset: s.offset,
      lastX: e.clientX,
      lastT: e.timeStamp,
      velocity: 0,
    })
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = drag.current
    if (!s.down) return
    const dx = e.clientX - s.startX

    if (!s.dragging && Math.abs(dx) > DRAG_THRESHOLD) {
      s.dragging = true
      setDragging(true)
      setActiveKey(null)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (!s.dragging) return

    s.offset = s.startOffset - dx
    const dt = (e.timeStamp - s.lastT) / 1000
    if (dt > 0) s.velocity = -(e.clientX - s.lastX) / dt
    s.lastX = e.clientX
    s.lastT = e.timeStamp
  }

  const onPointerEnd = (e: PointerEvent<HTMLDivElement>) => {
    const s = drag.current
    s.down = false
    if (!s.dragging) return
    s.dragging = false
    s.justDragged = true
    // Se ficou parado antes de soltar, não há inércia
    if (e.timeStamp - s.lastT > 80) s.velocity = 0
    setDragging(false)
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId)
    }
  }

  /* ---------- Centralização ---------- */

  const items = () =>
    Array.from(
      trackRef.current?.querySelectorAll<HTMLElement>("li[data-key]") ?? [],
    )

  const centerX = () => {
    const r = viewportRef.current?.getBoundingClientRect()
    return r ? r.left + r.width / 2 : window.innerWidth / 2
  }

  /** Índice do card cujo centro está mais perto do meio da faixa. */
  const nearestIndex = () => {
    const mid = centerX()
    let best = -1
    let bestDist = Infinity
    items().forEach((el, i) => {
      const r = el.getBoundingClientRect()
      const d = Math.abs(r.left + r.width / 2 - mid)
      if (d < bestDist) {
        bestDist = d
        best = i
      }
    })
    return best
  }

  /** Desliza a faixa até o card `index` ficar no centro e abre esse card. */
  const glideTo = (index: number) => {
    const list = items()
    const total = list.length
    const width = copyRef.current?.offsetWidth ?? 0
    if (!total || !width) return
    // As duas cópias se repetem: passar da ponta continua na outra cópia
    const wrapped = ((index % total) + total) % total
    const shift = index >= total ? width : index < 0 ? -width : 0
    const r = list[wrapped].getBoundingClientRect()
    const delta = r.left + r.width / 2 + shift - centerX()

    const s = drag.current
    glideRef.current?.stop()
    s.velocity = 0
    s.gliding = true
    setActiveKey(null)
    glideRef.current = animate(s.offset, s.offset + delta, {
      duration: Math.abs(delta) < 4 ? 0 : GLIDE,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => (s.offset = v),
      onComplete: () => {
        s.gliding = false
        // A faixa dá a volta: abre o card que de fato terminou no centro
        setActiveKey(items()[nearestIndex()]?.dataset.key ?? null)
      },
    })
  }

  const step = (dir: 1 | -1) => {
    const list = items()
    const current = list.findIndex((el) => el.dataset.key === activeRef.current)
    glideTo((current >= 0 ? current : nearestIndex()) + dir)
  }

  // Mouse entra na faixa: depois da intenção, centraliza o card mais próximo
  const onEnter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return
    clearTimeout(hoverTimer.current)
    if (activeRef.current !== null || drag.current.gliding) return
    drag.current.paused = true
    hoverTimer.current = setTimeout(() => {
      if (!drag.current.dragging) glideTo(nearestIndex())
    }, HOVER_INTENT)
  }

  const onLeave = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return
    clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => {
      glideRef.current?.stop()
      drag.current.gliding = false
      drag.current.paused = false
      setActiveKey(null)
    }, LEAVE_GRACE)
  }

  // Toque: tocar fora da faixa fecha o card aberto
  useEffect(() => {
    if (activeKey === null) return
    const close = (e: globalThis.PointerEvent) => {
      if (e.pointerType === "mouse") return
      if (!viewportRef.current?.contains(e.target as Node)) setActiveKey(null)
    }
    window.addEventListener("pointerdown", close)
    return () => window.removeEventListener("pointerdown", close)
  }, [activeKey])

  return (
    <>
      {/* Fundo desfocado para destacar o card ampliado (não captura o mouse) */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {activeKey !== null && (
              <motion.div
                aria-hidden
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="pointer-events-none fixed inset-0 z-40 backdrop-blur-md"
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
      <div
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        // Sempre acima do fundo desfocado, para nunca perder o hover
        className="group/marquee relative z-50"
      >
        <div
          ref={viewportRef}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerEnd}
          onPointerCancel={onPointerEnd}
          // Depois de um arraste, o clique não deve abrir links
          onClickCapture={(e) => {
            if (drag.current.justDragged) {
              e.preventDefault()
              e.stopPropagation()
            }
          }}
          onDragStart={(e) => e.preventDefault()}
          className={cn(
            // Espaço vertical para o card ampliado não ser cortado pela máscara
            "relative touch-pan-y overflow-x-clip py-6 select-none [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]",
            dragging ? "cursor-grabbing" : "cursor-grab",
          )}
        >
          <motion.div ref={trackRef} className="flex w-max" style={{ x }}>
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                ref={copy === 0 ? copyRef : undefined}
                aria-hidden={copy === 1}
                className="flex shrink-0 gap-8 pr-8"
              >
                {projects.map((project, i) => {
                  const key = `${copy}-${i}`
                  return (
                    <li
                      key={key}
                      data-key={key}
                      // Clique/toque num card que não está aberto: traz ao centro
                      onClick={(e) => {
                        if (drag.current.justDragged || activeKey === key)
                          return
                        e.preventDefault()
                        glideTo(items().indexOf(e.currentTarget))
                      }}
                      className={cn(
                        "relative transition-[filter] duration-700 ease-in-out",
                        activeKey === key ? "z-20" : "cursor-pointer",
                        // Os outros cards ficam desfocados enquanto um está em destaque
                        activeKey !== null && activeKey !== key && "blur-[6px]",
                      )}
                    >
                      <ProjectTile
                        project={project}
                        active={activeKey === key}
                        decorative={copy === 1}
                        expand={false}
                        className="aspect-[16/10] w-[64vw] max-w-[880px] sm:w-[64vw] lg:w-[64vw]"
                      />
                    </li>
                  )
                })}
              </ul>
            ))}
          </motion.div>
        </div>

        {/* Setas sutis nas laterais */}
        {[
          {
            dir: -1 as const,
            label: "Projeto anterior",
            icon: ChevronLeft,
            side: "left-4 lg:left-8",
          },
          {
            dir: 1 as const,
            label: "Próximo projeto",
            icon: ChevronRight,
            side: "right-4 lg:right-8",
          },
        ].map(({ dir, label, icon: Icon, side }) => (
          <button
            key={dir}
            type="button"
            onClick={() => step(dir)}
            aria-label={label}
            className={cn(
              "border-border/70 bg-background/50 text-foreground/70 hover:text-foreground hover:border-foreground/30 absolute top-1/2 z-30 flex size-11 -translate-y-1/2 items-center justify-center rounded-full border opacity-40 backdrop-blur-md transition-[opacity,color,border-color] group-hover/marquee:opacity-100 hover:opacity-100",
              side,
            )}
          >
            <Icon className="size-5" />
          </button>
        ))}
      </div>
    </>
  )
}
