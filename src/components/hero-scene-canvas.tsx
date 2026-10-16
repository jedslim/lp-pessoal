"use client"

import { Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { PerformanceMonitor, useGLTF } from "@react-three/drei"
import * as THREE from "three"
import {
  HEAD_IN_PHOTO,
  HERO_KEYS,
  HERO_LIGHTS,
  KEY_BASE_M,
  KEY_TRAVEL_M,
  PHOTO_EM_LG,
  RENDER_ELEVATION,
  pickTrick,
  type HeroKeyDef,
  type HeroKeyTrick,
} from "@/components/hero-scene-layout"
import { isTypingTarget } from "@/components/hero-typing"

/*
 * Cena WebGL da hero: as cinco teclas do Blender (public/3d/keys.glb)
 * flutuando em volta do retrato. Carregada só no cliente, logo depois do
 * primeiro paint, por `hero-scene.tsx` (que decide se o aparelho merece o
 * 3D). O cursor de vidro não mora mais aqui: ele acompanha a página inteira
 * (cursor-companion.tsx) e passa pela hero como a primeira parada.
 *
 * O canvas cobre a <section> inteira (z-[12]: na frente do glow, atrás do
 * nome e da foto). As teclas se posicionam em `em` a partir do centro da
 * cabeça, medido no DOM (`[data-hero-portrait]`), então acompanham a
 * composição em qualquer tela.
 *
 * Interação (tudo sem setState por quadro):
 *   mouse   cada tecla "olha" para o cursor, a cena faz parallax contra ele
 *           e a luz de estúdio gira junto (os reflexos andam nas teclas)
 *   hover   raycast manual nas caixas de colisão: a tecla afunda, a legenda
 *           acende e ela ganha um peteleco na direção do movimento do mouse
 *           (mola)
 *   clique  uma graça sorteada (sem repetir a anterior): afunda como um
 *           clique de verdade, pula com cambalhota, quica, treme ou leva um
 *           peteleco numa direção qualquer e volta na mola
 *   teclado a digitação de verdade: a tecla correspondente (⌘/Ctrl, K, { },
 *           /, Enter) afunda enquanto estiver apertada, com a legenda acesa,
 *           e as outras dão um pulinho, uma depois da outra. Fora da tela ou
 *           com o foco num campo de texto, nada acontece
 *   scroll  ao sair da hero as teclas giram e se espalham: as da frente
 *           passam pela câmera, as do fundo recolhem para trás da cabeça
 *   entrada o mesmo movimento ao contrário: tudo chega voando do ponto de
 *           saída até o lugar, uma tecla depois da outra
 * Profundidade: tecla mais funda reflete menos luz. Fora da tela o
 * frameloop para; se o fps cair, o dpr volta para 1.
 *
 * Entrada sem travar a página: o canvas nasce em `frameloop="demand"` e a
 * cena monta em etapas, cada uma numa tarefa própria (scheduler.yield):
 * luz (PMREM), materiais tecla a tecla, meshes ainda invisíveis e, por fim,
 * `gl.compileAsync` (os shaders compilam em paralelo, fora do quadro). Só
 * então as teclas aparecem, o frameloop vira "always" e o `onReady` dispara.
 * O fade de 500ms do hero-scene.tsx cobre essa espera.
 */

const GLB = "/3d/keys.glb"
const DRACO = "/draco/"

// O GLB começa a baixar junto com o chunk (antes do Canvas montar)
useGLTF.preload(GLB, DRACO, false)

/** Lente estreita, perto dos 100 mm dos renders: pouca distorção nas bordas. */
const FOV = 24
const CAM_Z = 20
const TAN = Math.tan((FOV * Math.PI) / 360)

/** O que pode estar sob o cursor e tem prioridade sobre as teclas. */
const UI = "a,button,input,textarea,select,label,[role=button]"

/** Legenda acesa (retroiluminada): vermelha nas teclas grafite, branca na
 *  vermelha. O albedo escurece junto, senão o branco lava o vermelho em rosa. */
const GLOW_RED = new THREE.Color().setRGB(1, 0.05, 0.06, THREE.LinearSRGBColorSpace)
const GLOW_RED_ALBEDO = new THREE.Color().setRGB(0.32, 0.01, 0.015, THREE.LinearSRGBColorSpace)
const GLOW_WHITE = new THREE.Color().setRGB(1, 0.97, 0.94, THREE.LinearSRGBColorSpace)

/** Legenda em repouso: um pouco da cor acesa já vaza (retroiluminação
 *  baixa), e o hover sobe a partir daí. */
const REST_GLOW = 0.15

/** Perspectiva atmosférica: tecla mais funda reflete menos luz ({ } e /
 *  ficam bem atrás do ⌘ e do K). */
const depthLight = (z: number) => 1 - clamp(-z / 4.5, 0, 1) * 0.6

/** O estúdio gira com o cursor (rad, suavizado): os reflexos correm pelo
 *  topo das teclas sem refazer o PMREM. */
const ENV_TURN = (8 * Math.PI) / 180
const ENV_TILT = (5 * Math.PI) / 180

/** Cede a vez ao navegador entre as etapas da montagem (input e pintura
 *  passam na frente). Sem scheduler.yield, cai num requestIdleCallback. */
function nextTask() {
  const s = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler
  if (typeof s?.yield === "function") return s.yield()
  return new Promise<void>((resolve) => {
    const w = window as Window & Partial<Pick<Window, "requestIdleCallback">>
    if (w.requestIdleCallback) w.requestIdleCallback(() => resolve(), { timeout: 100 })
    else window.setTimeout(resolve, 0)
  })
}

export type HeroSceneCanvasProps = {
  /** A <section> da hero: medidas, eventos e cursor. */
  section: HTMLElement
  /** Primeiro quadro desenhado com as teclas. */
  onReady: () => void
  /** Contexto WebGL perdido: volta para as imagens. */
  onLost: () => void
}

export default function HeroSceneCanvas({ section, onReady, onLost }: HeroSceneCanvasProps) {
  // GPU sofrendo (fps caindo): volta para 1x e não sobe mais. O canvas
  // ganha `data-perf="low"` (dá para conferir no DevTools)
  const [dpr, setDpr] = useState<number | [number, number]>([1, 1.75])
  const canvasEl = useRef<HTMLCanvasElement | null>(null)
  const lowDpr = useCallback(() => {
    setDpr(1)
    canvasEl.current?.setAttribute("data-perf", "low")
  }, [])
  // O monitor de fps só entra com a cena montada: os quadros esparsos da
  // montagem (frameloop "demand") pareceriam queda
  const [live, setLive] = useState(false)
  const onLive = useCallback(() => setLive(true), [])

  return (
    <Canvas
      dpr={dpr}
      // Até a cena montar, quadro só quando pedido; depois, "always"
      frameloop="demand"
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        // "Khronos PBR Neutral": o mesmo tone mapping dos renders
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{ fov: FOV, position: [0, 0, CAM_Z], near: 1, far: 60 }}
      // Eventos ficam com a <section> (raycast manual): o canvas não pega nada
      style={{ pointerEvents: "none" }}
      onCreated={({ gl }) => {
        canvasEl.current = gl.domElement
        gl.domElement.addEventListener(
          "webglcontextlost",
          (e) => {
            e.preventDefault()
            onLost()
          },
          { once: true },
        )
      }}
    >
      {live && <PerformanceMonitor onDecline={lowDpr} onFallback={lowDpr} />}
      <Suspense fallback={null}>
        <Keys section={section} onReady={onReady} onLive={onLive} />
      </Suspense>
    </Canvas>
  )
}

/* ---------- Luz: o estúdio dos renders como environment ---------- */

/**
 * Cada luz de área do Blender vira um plano emissivo (mesma radiância e
 * mesmo tamanho angular). O "rig" gira 26° para a câmera ficar reta e a luz
 * cair nas teclas como nos renders. Vira environment via PMREM, uma vez só:
 * o giro com o cursor é o `scene.environmentRotation`, de graça por quadro.
 */
async function buildStudio(gl: THREE.WebGLRenderer) {
  const env = new THREE.Scene()
  const rig = new THREE.Group()
  rig.rotation.x = RENDER_ELEVATION
  env.add(rig)
  const plane = new THREE.PlaneGeometry(1, 1)
  const mats: THREE.Material[] = []
  for (const l of HERO_LIGHTS) {
    const mat = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false })
    mat.color.setRGB(
      l.color[0] * l.intensity,
      l.color[1] * l.intensity,
      l.color[2] * l.intensity,
      THREE.LinearSRGBColorSpace,
    )
    mats.push(mat)
    const m = new THREE.Mesh(plane, mat)
    m.position.set(l.position[0], l.position[1], l.position[2])
    m.scale.set(l.scale[0], l.scale[1], 1)
    m.lookAt(0, 0, 0)
    rig.add(m)
  }
  const pmrem = new THREE.PMREMGenerator(gl)
  await warmPMREM(gl, pmrem, env)
  await nextTask()
  const rt = pmrem.fromScene(env, 0, 0.1, PMREM_FAR, { size: PMREM_SIZE })
  pmrem.dispose()
  plane.dispose()
  for (const m of mats) m.dispose()
  return rt
}

const PMREM_SIZE = 256
const PMREM_FAR = 100

/** Partes internas do PMREMGenerator (three 0.186) usadas no aquecimento. */
type PMREMInternals = {
  _setSize?: (size: number) => void
  _allocateTargets?: () => THREE.WebGLRenderTarget
  _ggxMaterial?: THREE.ShaderMaterial | null
  _pingPongRenderTarget?: THREE.WebGLRenderTarget | null
}

/**
 * O `fromScene` compila os próprios shaders na hora e espera por eles (o
 * filtro GGX tem um laço de 256 amostras: no ANGLE leva centenas de ms, a
 * tarefa longa da entrada). Aqui eles compilam antes, em paralelo, com
 * `compileAsync`, e o `fromScene` reaproveita os programas prontos (o cache
 * do three é por parâmetros, por isso a compilação acontece com um render
 * target ligado, como no PMREM). Se a API interna mudar, não aquece: o
 * `fromScene` funciona igual, só que travando.
 */
async function warmPMREM(gl: THREE.WebGLRenderer, generator: THREE.PMREMGenerator, env: THREE.Scene) {
  const pmrem = generator as unknown as PMREMInternals
  if (typeof pmrem._setSize !== "function" || typeof pmrem._allocateTargets !== "function") return
  // A chave do programa leva os atributos da geometria: os planos do filtro
  // só têm posição; o fundo é uma caixa (posição, normal e uv)
  const flat = new THREE.BufferGeometry()
  flat.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3))
  const box = new THREE.BoxGeometry()
  // Mesmos parâmetros do fundo que o PMREM desenha (mesmo programa)
  const back = new THREE.MeshBasicMaterial({ side: THREE.BackSide, depthWrite: false, depthTest: false })
  let scratch: THREE.WebGLRenderTarget | null = null
  try {
    // Cria o material GGX e o ping-pong do tamanho que o fromScene vai usar
    pmrem._setSize(PMREM_SIZE)
    scratch = pmrem._allocateTargets()
    const ggx = pmrem._ggxMaterial
    const target = pmrem._pingPongRenderTarget
    if (!ggx || !target) return
    const warm = new THREE.Scene()
    warm.add(new THREE.Mesh(flat, ggx), new THREE.Mesh(box, back))
    const cam = new THREE.OrthographicCamera()
    const prev = gl.getRenderTarget()
    gl.setRenderTarget(target)
    const ready = Promise.all([gl.compileAsync(warm, cam), gl.compileAsync(env, cam)])
    gl.setRenderTarget(prev)
    await ready
  } catch {
    // Sem aquecimento
  } finally {
    scratch?.dispose()
    flat.dispose()
    box.dispose()
    back.dispose()
  }
}

/* ---------- Teclas ---------- */

/** Estado de cada tecla (molas). */
type Sim = {
  hovered: boolean
  held: boolean
  keyDown: boolean
  /** Segundos de aperto vindos de um clique. */
  pulse: number
  press: number
  pressV: number
  /** Peteleco (rad e rad/s), em X e Y do mundo. */
  fx: number
  fy: number
  fvx: number
  fvy: number
  /** Pulinho da digitação (em, para cima) e quando ele dispara (s). */
  hop: number
  hopV: number
  hopAt: number
  /** Salto do clique (em, para cima), com gravidade e quique. */
  air: number
  airV: number
  bounce: number
  /** Cambalhota do pulo (rad, em X do mundo). */
  flip: number
  flipV: number
  flipTo: number
  /** Tremida (1 → 0). */
  shake: number
  /** Peteleco do clique: deslocamento (em) e velocidade, com mola. */
  ox: number
  oy: number
  ovx: number
  ovy: number
  /** Última graça (não repete). */
  trick: HeroKeyTrick | null
  /** Entrada: 0 = no ponto de saída (voando), 1 = no lugar. */
  enter: number
  enterV: number
  /** Brilho de hover (0 a 1). */
  lit: number
}

const newSim = (): Sim => ({
  hovered: false,
  held: false,
  keyDown: false,
  pulse: 0,
  press: 0,
  pressV: 0,
  fx: 0,
  fy: 0,
  fvx: 0,
  fvy: 0,
  hop: 0,
  hopV: 0,
  hopAt: 0,
  air: 0,
  airV: 0,
  bounce: 0,
  flip: 0,
  flipV: 0,
  flipTo: 0,
  shake: 0,
  ox: 0,
  oy: 0,
  ovx: 0,
  ovy: 0,
  trick: null,
  enter: 0,
  enterV: 0,
  lit: 0,
})

/** Clique numa tecla: uma graça sorteada. */
function playTrick(s: Sim) {
  const trick = pickTrick(s.trick)
  s.trick = trick
  switch (trick) {
    case "press":
      // Clique de tecla de verdade: até o fundo, segura e solta com quique
      s.pulse = 0.26
      break
    case "jump":
      // Pulo alto com uma cambalhota para a frente e pouso seco
      s.airV = 5.6
      s.bounce = 0.22
      s.flipTo += Math.PI * 2
      break
    case "bounce":
      // Bola de borracha: pula baixo e quica até parar
      s.airV = 3.9
      s.bounce = 0.58
      s.fvx -= 2.2
      break
    case "shake":
      s.shake = 1
      break
    case "flick": {
      // Peteleco: sai numa direção qualquer, tomba e volta na mola
      const a = Math.random() * Math.PI * 2
      s.ovx += Math.cos(a) * 6
      s.ovy += Math.sin(a) * 6
      s.fvx += Math.sin(a) * 9
      s.fvy += Math.cos(a) * 9
      break
    }
  }
}

/** Gravidade do salto (em/s²). */
const GRAVITY = 21

/** Objetos reaproveitados no quadro (nada de alocação por frame). A hero
 *  só tem uma cena, então ficam no módulo. */
const TMP = {
  ray: new THREE.Raycaster(),
  ndc: new THREE.Vector2(),
  euler: new THREE.Euler(),
  qa: new THREE.Quaternion(),
  qb: new THREE.Quaternion(),
  hits: [] as THREE.Intersection[],
  list: [] as THREE.Object3D[],
  /** Índice de cada tecla da lista. */
  ids: [] as number[],
}

/** Pulinho da digitação: impulso inicial (em/s). Com a mola do quadro, sobe
 *  ~0,17em e volta em ~0,4 s. */
const HOP_KICK = 3.4
/** Ordem do pulinho (da esquerda para a direita na tela, desktop). */
const HOP_ORDER = (() => {
  const xs = HERO_KEYS.map((d) => d.lg.x)
  const sorted = [...xs].sort((a, b) => a - b)
  return xs.map((x) => sorted.indexOf(x))
})()

const AX_X = new THREE.Vector3(1, 0, 0)
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)

/** Soma offsetLeft/Top até a raiz (ignora transforms: posição de layout). */
function offsetWithin(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  let n: HTMLElement | null = el
  while (n && n !== root) {
    x += n.offsetLeft
    y += n.offsetTop
    n = n.offsetParent as HTMLElement | null
  }
  return { x, y }
}

/** Geometria do GLB e materiais clonados de uma tecla (cada uma acende
 *  sozinha). */
function makePart(def: HeroKeyDef, nodes: Record<string, THREE.Object3D>) {
  const body = nodes[def.node] as THREE.Mesh
  const legend = nodes[`${def.node}_legend`] as THREE.Mesh
  const bodyMat = (body.material as THREE.MeshStandardMaterial).clone()
  const legendMat = (legend.material as THREE.MeshStandardMaterial).clone()
  const base = new THREE.Quaternion()
    .setFromAxisAngle(AX_X, RENDER_ELEVATION)
    .multiply(new THREE.Quaternion(...(def.lg.pose ?? def.pose)))
  const axis = new THREE.Vector3(...def.lg.exit.axis).normalize()
  const glow = def.id === "enter" ? GLOW_WHITE : GLOW_RED
  const legendBase = legendMat.emissive.clone()
  return {
    def,
    body,
    legend,
    bodyMat,
    legendMat,
    base,
    axis,
    // Repouso: o emissive do GLB com um pouco da cor acesa
    legendRest: legendBase.clone().lerp(glow, REST_GLOW),
    legendColor: legendMat.color.clone(),
    glow,
    // Na tecla vermelha a legenda já é branca: só acende
    glowAlbedo: def.id === "enter" ? legendMat.color.clone() : GLOW_RED_ALBEDO,
  }
}
type Part = ReturnType<typeof makePart>

function Keys({
  section,
  onReady,
  onLive,
}: {
  section: HTMLElement
  onReady: () => void
  /** Cena montada e compilada: o quadro corre normal a partir daqui. */
  onLive: () => void
}) {
  const { nodes } = useGLTF(GLB, DRACO, false) as unknown as {
    nodes: Record<string, THREE.Object3D>
  }
  // `get()` nos efeitos: cena e renderer do three são mutáveis por natureza
  const get = useThree((s) => s.get)
  const setFrameloop = useThree((s) => s.setFrameloop)

  // As teclas entram aos poucos (uma por tarefa); o JSX só lê, o quadro
  // mexe nos materiais pelo ref
  const [parts, setParts] = useState<Part[]>([])
  const partsRef = useRef<Part[]>([])
  const root = useRef<THREE.Group>(null)
  // Montagem: `booted` libera o quadro; `inView` vem do IntersectionObserver
  const boot = useRef({ booted: false, inView: true })
  // Erro numa etapa assíncrona volta para o React: o SceneBoundary do
  // hero-scene.tsx pega e a hero cai para as imagens
  const [failure, setFailure] = useState<Error | null>(null)
  if (failure) throw failure
  const fail = useCallback((e: unknown) => setFailure(e instanceof Error ? e : new Error(String(e))), [])

  // 1) Luz e materiais, em etapas
  useEffect(() => {
    let alive = true
    const made: Part[] = []
    let envRT: THREE.WebGLRenderTarget | null = null
    const run = async () => {
      // A luz (PMREM) numa tarefa só dela
      await nextTask()
      if (!alive) return
      const { gl, scene } = get()
      const studio = await buildStudio(gl)
      if (!alive) {
        studio.dispose()
        return
      }
      envRT = studio
      scene.environment = envRT.texture
      // Uma tecla por tarefa; o React monta os meshes conforme chegam
      for (const def of HERO_KEYS) {
        await nextTask()
        if (!alive) return
        made.push(makePart(def, nodes))
        setParts(made.slice())
      }
    }
    run().catch((e) => alive && fail(e))
    return () => {
      alive = false
      partsRef.current = []
      for (const p of made) {
        p.bodyMat.dispose()
        p.legendMat.dispose()
      }
      get().scene.environment = null
      envRT?.dispose()
    }
  }, [get, nodes, fail])

  useLayoutEffect(() => {
    partsRef.current = parts
  }, [parts])

  // 2) Todas montadas (invisíveis): compila os shaders sem travar e só
  // então mostra e solta o frameloop
  const allMounted = parts.length === HERO_KEYS.length
  useEffect(() => {
    if (!allMounted) return
    let alive = true
    const run = async () => {
      await nextTask()
      const { gl, scene, camera } = get()
      const group = root.current
      if (!alive || !group) return
      // KHR_parallel_shader_compile: o driver compila em paralelo e a
      // promessa só resolve quando os programas estão prontos
      await gl.compileAsync(group, camera, scene)
      await nextTask()
      if (!alive) return
      group.visible = true
      boot.current.booted = true
      onLive()
      setFrameloop(boot.current.inView ? "always" : "never")
    }
    run().catch((e) => alive && fail(e))
    return () => {
      alive = false
    }
  }, [allMounted, get, onLive, setFrameloop, fail])

  const groups = useRef<(THREE.Group | null)[]>([])
  const sinks = useRef<(THREE.Group | null)[]>([])
  const proxies = useRef<(THREE.Mesh | null)[]>([])
  const sims = useRef<Sim[]>(HERO_KEYS.map(newSim))
  const hovered = useRef(-1)

  // Entradas (escritas pelos listeners, lidas no quadro)
  const input = useRef({ cx: -1, cy: -1, on: false, overUI: false, vx: 0, vy: 0, t: 0, mx: 0, my: 0 })
  // Medidas do layout, em px da section
  // (ctaB: base da caixa dos CTAs; railT: trilho de baixo; 0 = sem medida)
  const box = useRef({ top: 0, left: 0, w: 1, h: 1, hx: 0, hy: 0, em: 100, ctaB: 0, railT: 0 })
  // Valores suavizados
  const smooth = useRef({ mx: 0, my: 0, cx: 0, cy: 0, on: 0, p: 0, time: 0, start: -1, ready: false })

  useEffect(() => {
    const B = box.current
    const I = input.current
    const sim = sims.current
    const photo = section.querySelector<HTMLElement>("[data-hero-portrait]")
    const ctas = section.querySelector<HTMLElement>("[data-hero-ctas]")
    const rail = section.querySelector<HTMLElement>("[data-hero-rail]")

    const measure = () => {
      const r = section.getBoundingClientRect()
      B.top = r.top + window.scrollY
      B.left = r.left + window.scrollX
      B.w = r.width
      B.h = r.height
      if (photo) {
        const o = offsetWithin(photo, section)
        B.em = photo.offsetWidth / PHOTO_EM_LG
        B.hx = o.x + photo.offsetWidth * HEAD_IN_PHOTO.x
        B.hy = o.y + photo.offsetHeight * HEAD_IN_PHOTO.y
      }
      B.ctaB = ctas ? offsetWithin(ctas, section).y + ctas.offsetHeight : 0
      B.railT = rail ? offsetWithin(rail, section).y : 0
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(section)
    if (photo) ro.observe(photo)
    if (ctas) ro.observe(ctas)
    void document.fonts?.ready.then(measure)

    // Fora da tela, nada de quadro (antes de montar, fica em "demand")
    const io = new IntersectionObserver(([e]) => {
      boot.current.inView = e.isIntersecting
      if (boot.current.booted) setFrameloop(e.isIntersecting ? "always" : "never")
    })
    io.observe(section)

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return
      const now = e.timeStamp
      const dt = Math.max(now - I.t, 8) / 1000
      if (I.on) {
        // Velocidade do ponteiro (px/s), suavizada: vira o peteleco do hover
        I.vx += ((e.clientX - I.cx) / dt - I.vx) * 0.5
        I.vy += ((e.clientY - I.cy) / dt - I.vy) * 0.5
      }
      I.t = now
      I.cx = e.clientX
      I.cy = e.clientY
      I.on = true
      I.mx = (e.clientX / window.innerWidth) * 2 - 1
      I.my = (e.clientY / window.innerHeight) * 2 - 1
      I.overUI = !!(e.target as Element | null)?.closest?.(UI)
    }
    const onLeave = () => {
      I.on = false
      I.vx = 0
      I.vy = 0
    }
    const isUI = (e: Event) => !!(e.target as Element | null)?.closest?.(UI)

    const onDown = (e: PointerEvent) => {
      const i = hovered.current
      if (i < 0 || e.button !== 0 || isUI(e)) return
      sim[i].held = true
    }
    const onUp = () => {
      for (const s of sim) s.held = false
    }
    // Clique numa tecla: uma graça sorteada (nada abre nada)
    const onClick = (e: MouseEvent) => {
      const i = hovered.current
      if (i < 0 || isUI(e)) return
      playTrick(sim[i])
    }

    // Teclado real: guarda pelo `code` qual tecla desceu (o `key` do keyup
    // pode mudar se o Shift soltar antes)
    const held = new Map<string, number[]>()
    const onKeyDown = (e: KeyboardEvent) => {
      // Fora da tela ou escrevendo num campo: a digitação não é com a hero
      if (!boot.current.inView || isTypingTarget(e.target)) return
      if (held.has(e.code)) return
      const ids: number[] = []
      HERO_KEYS.forEach((d, j) => {
        if (d.keys.includes(e.key)) ids.push(j)
      })
      // As outras dão um pulinho, uma depois da outra (da esquerda para a
      // direita na tela). Segurar a tecla não repete
      if (!e.repeat) {
        const now = smooth.current.time
        HERO_KEYS.forEach((d, j) => {
          if (ids.includes(j)) return
          sim[j].hopAt = now + 0.001 + HOP_ORDER[j] * 0.04
        })
      }
      if (!ids.length) return
      held.set(e.code, ids)
      for (const j of ids) sim[j].keyDown = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const ids = held.get(e.code)
      if (!ids) return
      held.delete(e.code)
      for (const j of ids) {
        // Outra tecla física ainda segura esta? (Ctrl esquerdo + direito)
        const still = [...held.values()].some((v) => v.includes(j))
        if (!still) sim[j].keyDown = false
      }
    }
    const onBlur = () => {
      held.clear()
      for (const s of sim) {
        s.keyDown = false
        s.held = false
      }
    }

    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    section.addEventListener("pointerdown", onDown)
    window.addEventListener("pointerup", onUp)
    section.addEventListener("click", onClick)
    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("keyup", onKeyUp)
    window.addEventListener("blur", onBlur)
    return () => {
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      section.removeEventListener("pointerdown", onDown)
      window.removeEventListener("pointerup", onUp)
      section.removeEventListener("click", onClick)
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("keyup", onKeyUp)
      window.removeEventListener("blur", onBlur)
      section.style.removeProperty("cursor")
    }
  }, [section, setFrameloop])

  useFrame((state, delta) => {
    // Quadros da montagem (pedidos pelo próprio R3F): nada a animar ainda
    if (!boot.current.booted) return
    const tmp = TMP
    const parts = partsRef.current
    const dt = Math.min(delta, 1 / 30)
    const W = state.size.width
    const H = state.size.height
    const B = box.current
    const I = input.current
    const S = smooth.current
    // Relógio próprio: o setFrameloop do R3F zera o clock, e a entrada
    // tocaria de novo toda vez que a hero voltasse para a tela
    S.time += dt
    const t = S.time
    const sim = sims.current
    if (S.start < 0) S.start = t
    const age = t - S.start

    // Cursor e scroll suavizados
    const kMouse = 1 - Math.exp(-dt * 3.2)
    S.mx += (I.mx - S.mx) * kMouse
    S.my += (I.my - S.my) * kMouse
    const px = I.cx - (B.left - window.scrollX)
    const py = I.cy - (B.top - window.scrollY)
    const kPointer = 1 - Math.exp(-dt * 6)
    S.cx += (px - S.cx) * kPointer
    S.cy += (py - S.cy) * kPointer
    S.on += ((I.on ? 1 : 0) - S.on) * (1 - Math.exp(-dt * 3))
    // A velocidade do ponteiro some sozinha quando ele para
    I.vx *= Math.exp(-dt * 6)
    I.vy *= Math.exp(-dt * 6)
    // Scroll: responde já no primeiro px (ease-out), sem "zona morta"
    const raw = clamp((window.scrollY - B.top) / (B.h * 0.85), 0, 1)
    S.p += (raw - S.p) * (1 - Math.exp(-dt * 7))
    const sp = 1 - (1 - S.p) ** 1.5

    // A luz de estúdio gira com o cursor (±8° em Y, ±5° em X, já suavizado):
    // os reflexos correm pelo topo das teclas
    state.scene.environmentRotation.set(S.my * ENV_TILT, S.mx * ENV_TURN, 0)

    // Hover: raycast nas caixas de colisão (ficam no lugar enquanto a tecla
    // afunda, então o hover não pisca)
    let hit = -1
    if (I.on && !I.overUI && px >= 0 && py >= 0 && px <= W && py <= H) {
      tmp.ndc.set((px / W) * 2 - 1, -(py / H) * 2 + 1)
      tmp.ray.setFromCamera(tmp.ndc, state.camera)
      tmp.list.length = 0
      tmp.ids.length = 0
      proxies.current.forEach((m, i) => {
        if (!m) return
        tmp.list.push(m)
        tmp.ids.push(i)
      })
      tmp.hits.length = 0
      tmp.ray.intersectObjects(tmp.list, false, tmp.hits)
      if (tmp.hits.length) hit = tmp.ids[tmp.list.indexOf(tmp.hits[0].object)]
    }
    if (hit !== hovered.current) {
      const prev = hovered.current
      if (prev >= 0) sim[prev].hovered = false
      if (hit >= 0) {
        const s = sim[hit]
        s.hovered = true
        // Peteleco na direção do movimento do mouse
        s.fvy += clamp(I.vx * 0.0032, -7, 7)
        s.fvx += clamp(I.vy * 0.0032, -7, 7)
      }
      hovered.current = hit
      // Tudo reage ao clique
      if (hit >= 0) section.style.setProperty("cursor", "pointer")
      else section.style.removeProperty("cursor")
    }

    // Px da tela → unidades do mundo, na profundidade z
    const perPx = (z: number) => (2 * (CAM_Z - z) * TAN) / H
    const em = B.em

    for (let i = 0; i < parts.length; i++) {
      const g = groups.current[i]
      const sink = sinks.current[i]
      if (!g || !sink) continue
      const p = parts[i]
      const d = p.def.lg
      const s = sim[i]

      // Entrada: as teclas chegam voando do ponto de saída do scroll (o
      // mesmo movimento da dispersão, ao contrário), uma depois da outra,
      // com uma mola que passa um tico do lugar e assenta
      const to = age > 0.05 + HOP_ORDER[i] * 0.09 ? 1 : 0
      s.enterV += ((to - s.enter) * 26 - s.enterV * 8.2) * dt
      s.enter += s.enterV * dt
      const fly = 1 - s.enter
      // Espalhamento total: scroll + o que falta da entrada
      const spread = sp + fly * 1.15

      // Aperto: hover afunda um pouco; clique, teclado, mouse segurando e o
      // pulso, até o fundo
      s.pulse = Math.max(0, s.pulse - dt)
      const full = s.held || s.keyDown || s.pulse > 0
      const pressTo = full ? 1 : s.hovered ? 0.36 : 0
      s.pressV += ((pressTo - s.press) * 520 - s.pressV * 30) * dt
      s.press += s.pressV * dt
      s.lit += ((s.hovered ? 1 : 0) - s.lit) * (1 - Math.exp(-dt * 8))

      // Peteleco e volta (molas)
      s.fvx += (-80 * s.fx - 7 * s.fvx) * dt
      s.fvy += (-80 * s.fy - 7 * s.fvy) * dt
      s.fx += s.fvx * dt
      s.fy += s.fvy * dt
      // Pulinho: um impulso para cima e uma mola que traz de volta (passa
      // um pouco do ponto, como uma tecla solta). Ganha um tombo leve
      if (s.hopAt > 0 && t >= s.hopAt) {
        s.hopAt = 0
        s.hopV += HOP_KICK
        s.fvx -= 1.6
        s.fvy += (i % 2 ? 1 : -1) * 1.2
      }
      s.hopV += (-190 * s.hop - 12 * s.hopV) * dt
      s.hop += s.hopV * dt
      // Salto do clique: gravidade e quique (cada pouso afunda a tecla)
      if (s.air > 0 || s.airV !== 0) {
        s.airV -= GRAVITY * dt
        s.air += s.airV * dt
        if (s.air <= 0) {
          s.air = 0
          if (-s.airV > 1) {
            s.airV = -s.airV * s.bounce
            s.pulse = Math.max(s.pulse, 0.05)
            s.fvx += 1.4
          } else s.airV = 0
        }
      }
      s.flipV += ((s.flipTo - s.flip) * 70 - s.flipV * 11) * dt
      s.flip += s.flipV * dt
      s.shake = Math.max(0, s.shake - dt / 0.75)
      // Peteleco do clique: mola solta, passa do lugar e volta
      s.ovx += (-58 * s.ox - 6 * s.ovx) * dt
      s.ovy += (-58 * s.oy - 6 * s.ovy) * dt
      s.ox += s.ovx * dt
      s.oy += s.ovy * dt
      const shake = s.shake * s.shake

      // Posição em px da section
      const w = 0.55 + i * 0.07
      const ph = i * 1.9
      let ay = B.hy + d.y * em
      // Longe dos CTAs, sem passar do trilho de baixo (o trilho manda)
      if (d.belowCtas && B.ctaB > 0 && B.railT > B.ctaB) {
        const half = d.size * em * 0.55
        const lo = B.ctaB + d.belowCtas + half
        const hi = B.railT - 14 - half
        ay = hi < lo ? hi : clamp(ay, lo, hi)
      }
      let ax = B.hx + d.x * em + Math.cos(t * w * 0.8 + ph) * 0.025 * em
      ay += Math.sin(t * w + ph) * 0.04 * em - (s.hop + s.air) * em
      ax += (s.ox + Math.sin(t * 57) * 0.035 * shake) * em
      ay += s.oy * em
      // Parallax contra o cursor (como o nome e o glow, que ficam atrás)
      ax -= S.mx * d.par
      ay -= S.my * d.par * 0.6
      // Scroll e entrada: espalha
      ax += d.exit.x * em * spread
      ay += d.exit.y * em * spread
      // As de perto passam pela câmera, as do fundo afundam no escuro
      const z = d.z + d.exit.z * spread
      const k = perPx(z)
      g.position.set((ax - W / 2) * k, -(ay - H / 2) * k, z)
      g.scale.setScalar((d.size * em * perPx(d.z)) / KEY_BASE_M)

      // Rotação: olhar para o cursor + peteleco + tremida + cambalhota +
      // respiração (no mundo), giro do scroll e da entrada, pose do render
      const look = S.on * clamp(s.enter, 0, 1)
      const lx = clamp((S.cx - ax) / (5 * em), -1, 1) * look
      const ly = clamp((S.cy - ay) / (5 * em), -1, 1) * look
      tmp.euler.set(
        ly * 0.3 + s.fx + s.flip + Math.sin(t * 0.42 * w + ph) * 0.06,
        lx * 0.38 + s.fy + Math.sin(t * 0.5 * w + ph * 1.3) * 0.1,
        Math.sin(t * 0.3 * w + ph) * 0.04 + Math.sin(t * 46) * 0.3 * shake,
      )
      tmp.qa.setFromEuler(tmp.euler)
      tmp.qb.setFromAxisAngle(p.axis, d.exit.spin * spread)
      g.quaternion.copy(tmp.qa).multiply(tmp.qb).multiply(p.base)

      // A tecla desce no próprio eixo (curso real do switch)
      sink.position.y = -KEY_TRAVEL_M * clamp(s.press, -0.2, 1.15)
      // Legenda acende ao apertar; o corpo brilha um pouco no hover
      // A cor vira logo no hover (meio-termo seria rosa) e o brilho cresce
      // com o aperto. Fica perto de 1: acima disso o tone mapping Neutral
      // dessatura e o vermelho vira salmão
      const glow = clamp(s.press, 0, 1)
      const tint = clamp(glow / 0.4, 0, 1)
      const dim = depthLight(z)
      p.legendMat.color.copy(p.legendColor).lerp(p.glowAlbedo, tint)
      p.legendMat.emissive.copy(p.legendRest).lerp(p.glow, tint)
      p.legendMat.emissiveIntensity =
        (p.def.id === "enter" ? 1 + glow * 1.6 : 1 + tint * (glow * 0.6 - 0.25)) *
        (0.6 + 0.4 * dim)
      p.legendMat.envMapIntensity = dim
      p.bodyMat.envMapIntensity = dim * (1 + s.lit * 0.35)
    }

    if (!S.ready && parts.length) {
      S.ready = true
      requestAnimationFrame(onReady)
    }
  })

  return (
    // Invisível até os shaders compilarem (o compileAsync percorre mesmo assim)
    <group ref={root} visible={false}>
      {parts.map((p, i) => (
        <group
          key={p.def.id}
          ref={(el) => {
            groups.current[i] = el
          }}
        >
          {/* Caixa de colisão (invisível): o raycast é nela, não nos 14k tris */}
          <mesh
            visible={false}
            ref={(el) => {
              proxies.current[i] = el
            }}
          >
            <boxGeometry args={[0.0184, 0.0102, 0.0184]} />
          </mesh>
          <group
            ref={(el) => {
              sinks.current[i] = el
            }}
          >
            <mesh geometry={p.body.geometry} material={p.bodyMat}>
              <mesh
                geometry={p.legend.geometry}
                material={p.legendMat}
                position={p.legend.position}
                quaternion={p.legend.quaternion}
                scale={p.legend.scale}
              />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

