"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, Lightformer, MeshTransmissionMaterial, useGLTF } from "@react-three/drei"
import * as THREE from "three"
import { HERO_LIGHTS, RENDER_ELEVATION } from "@/components/hero-scene-layout"
import { COMPANION_STOPS, type CompanionStop, type Pt } from "@/components/cursor-companion-stops"
import { HeroShow } from "@/components/cursor-companion-hero"

/*
 * Cena do cursor de vidro (montada por cursor-companion.tsx). Um canvas fixo
 * do tamanho da janela; a câmera fica a uma distância em que 1 unidade do
 * mundo = 1 px no plano z = 0, então tudo aqui é medido em px.
 *
 * Vidro: MeshTransmissionMaterial (drei) sobre a malha do Blender
 * (cursor-glass.glb, origem na ponta). A espessura cresce nas bordas (o
 * shader lê o ângulo de visão): o caminho longo pelo bevel satura o
 * vermelho e o miolo, visto de frente, fica claro. Um fresnel aditivo
 * acende o contorno. Como o canvas é transparente (o site é DOM), o vidro
 * refrata um fundo que mora na própria cena e só existe nos buffers da
 * transmissão: glow vermelho, grade fina e duas faixas de softbox, na
 * versão escura ou clara conforme a seção.
 *
 * Coreografia (por quadro, sem setState):
 *   paradas  cada seção tem um alvo `data-companion` (cursor-companion-stops.ts);
 *            a ponta pousa num ponto dele, medido ao vivo
 *   voo      quando o alvo da próxima parada entra pela base da tela, o
 *            cursor viaja numa curva (posição pela rolagem: subir a página
 *            faz o caminho de volta); a ponta segue a direção do voo, ele
 *            inclina e chega um pouco mais perto da câmera no meio
 *   hero     uma coreografia em loop (cursor-companion-hero.ts): clica em
 *            "Ver trabalhos", depois em "Falar comigo", passeia pelo nome
 *            (o peso da fonte sobe sob a ponta) e descansa; o mouse na
 *            hero interrompe e ela volta depois de alguns segundos parado
 *   pouso    flutua devagar e a ponta gira para o mouse (com limite);
 *            no teclado da Stack ela aperta a tecla que a vitrine acende,
 *            na tecla deploy dá um toque de vez em quando
 *   clique   em qualquer lugar: afunda/achata e solta um anel de luz
 * Performance: frameloop "demand"; o quadro só roda enquanto há rolagem,
 * mouse, clique ou mola andando (e alguns segundos depois, com a flutuação
 * morrendo suave). Aba oculta: "never".
 */

const GLB = "/3d/cursor-glass.glb"
const DRACO = "/draco/"
useGLTF.preload(GLB, DRACO, false)

const FOV = 20
const TAN = Math.tan((FOV * Math.PI) / 360)

/** manifest.cursorGlass: direção da ponta (y para cima) e centro da caixa
 *  em relação à ponta (unidades do modelo, altura = 1). */
const TIP_WORLD = Math.atan2(0.7278, -0.6858)
const CENTER = new THREE.Vector3(0.469, -0.4819, 0)
/** Pose natural de ponteiro, em ângulo de tela (y para baixo). */
const NATURAL = Math.atan2(-0.7278, -0.6858)
/** Leve 3/4: a espessura do vidro aparece. */
const POSE = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.2, -0.34, 0.02))
/** Quanto a mira pode girar a partir da pose de ponteiro (rad). */
const AIM_MAX = (70 * Math.PI) / 180

/** Reflexo do estúdio no vidro (scene.environmentIntensity). */
const ENV_INTENSITY = 0.2

/** Segundos acordado depois do último estímulo. */
const AWAKE = 4.5
/** Chegada da próxima parada: a ponta dela entre estas alturas da tela. */
const ENTER_FROM = 1.05
const ENTER_TO = 0.76
/** Faixa em que a ponta fica enquanto espera a próxima (fração da altura). */
const BAND = [0.13, 0.87] as const

const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b)
const smooth01 = (x: number) => {
  const t = clamp(x, 0, 1)
  return t * t * (3 - 2 * t)
}
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const lerpAngle = (a: number, b: number, t: number) => a + wrap(b - a) * t

export type CompanionCanvasProps = {
  /** Primeiro quadro com o vidro na tela. */
  onReady: () => void
  /** Contexto WebGL perdido. */
  onLost: () => void
}

export default function CompanionCanvas({ onReady, onLost }: CompanionCanvasProps) {
  return (
    <Canvas
      dpr={[1, 1.75]}
      frameloop="demand"
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        // O mesmo tone mapping dos renders do Blender
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      camera={{ fov: FOV, position: [0, 0, 1000], near: 10, far: 8000 }}
      style={{ pointerEvents: "none" }}
      onCreated={({ gl }) => {
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
      <Studio />
      <Suspense fallback={null}>
        <Companion onReady={onReady} />
      </Suspense>
    </Canvas>
  )
}

/** A luz das teclas (manifest): cada luz de área do Blender vira um
 *  Lightformer; o environment é gerado uma vez só. */
function Studio() {
  const colors = useMemo(
    () => HERO_LIGHTS.map((l) => new THREE.Color().setRGB(l.color[0], l.color[1], l.color[2], THREE.LinearSRGBColorSpace)),
    [],
  )
  return (
    // A luz das teclas é forte para vidro: com a intensidade cheia a face
    // plana espelha a softbox inteira e vira um véu leitoso. (No three 0.186
    // o envMapIntensity do material não vale para scene.environment.)
    <Environment resolution={256} frames={1} environmentIntensity={ENV_INTENSITY}>
      <group rotation-x={RENDER_ELEVATION}>
        {HERO_LIGHTS.map((l, i) => (
          <Lightformer
            key={i}
            form="rect"
            position={[l.position[0], l.position[1], l.position[2]]}
            scale={[l.scale[0], l.scale[1], 1]}
            intensity={l.intensity}
            color={colors[i]}
            target={[0, 0, 0]}
          />
        ))}
      </group>
    </Environment>
  )
}

/* ---------- Texturas e materiais ---------- */

/** O fundo que o vidro refrata (canvas 2D): glow vermelho no centro, miolo
 *  quente, grade fina e faixas de softbox na diagonal. */
function backdropTexture(light: boolean) {
  const S = 512
  const c = document.createElement("canvas")
  c.width = c.height = S
  const ctx = c.getContext("2d")!
  ctx.fillStyle = light ? "#eeede8" : "#09090b"
  ctx.fillRect(0, 0, S, S)
  // O miolo quente fica um pouco acima/à esquerda do centro: a face do
  // vidro ganha um degradê (claro perto da ponta, vermelho na base)
  const glow = ctx.createRadialGradient(S * 0.42, S * 0.4, 0, S / 2, S / 2, S / 2)
  if (light) {
    glow.addColorStop(0, "rgba(255,120,128,0.55)")
    glow.addColorStop(0.45, "rgba(255,90,100,0.18)")
    glow.addColorStop(1, "rgba(255,90,100,0)")
  } else {
    glow.addColorStop(0, "rgba(255,128,136,0.96)")
    glow.addColorStop(0.12, "rgba(240,56,68,0.94)")
    glow.addColorStop(0.3, "rgba(204,18,30,0.88)")
    glow.addColorStop(0.55, "rgba(112,8,15,0.6)")
    glow.addColorStop(0.8, "rgba(50,4,7,0.3)")
    glow.addColorStop(1, "rgba(20,2,4,0)")
  }
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, S, S)
  // Papel milimetrado do site: linhas finas que a refração entorta
  ctx.strokeStyle = light ? "rgba(20,20,24,0.16)" : "rgba(255,235,235,0.2)"
  ctx.lineWidth = 2
  for (let p = 0; p <= S; p += S / 22) {
    ctx.beginPath()
    ctx.moveTo(p, 0)
    ctx.lineTo(p, S)
    ctx.moveTo(0, p)
    ctx.lineTo(S, p)
    ctx.stroke()
  }
  // Faixas de softbox
  ctx.save()
  ctx.translate(S / 2, S / 2)
  ctx.rotate(-0.62)
  for (const [x, w, a] of [
    [-0.1, 0.05, light ? 0.75 : 0.55],
    [0.06, 0.02, light ? 0.85 : 0.7],
    [0.2, 0.012, light ? 0.9 : 0.75],
  ] as const) {
    const g = ctx.createLinearGradient(S * (x - w), 0, S * (x + w), 0)
    g.addColorStop(0, "rgba(255,248,246,0)")
    g.addColorStop(0.5, `rgba(255,248,246,${a})`)
    g.addColorStop(1, "rgba(255,248,246,0)")
    ctx.fillStyle = g
    ctx.fillRect(-S, -S, S * 2, S * 2)
  }
  ctx.restore()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function radialTexture(stops: readonly [number, string][]) {
  const S = 128
  const c = document.createElement("canvas")
  c.width = c.height = S
  const ctx = c.getContext("2d")!
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  for (const [o, col] of stops) g.addColorStop(o, col)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, S, S)
  return new THREE.CanvasTexture(c)
}

/** Fresnel aditivo: o contorno do vidro acende como na referência. */
function fresnelMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uPower: { value: 2.6 }, uIntensity: { value: 0.75 } },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform float uPower;
      uniform float uIntensity;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), uPower);
        vec3 col = mix(vec3(1.0, 0.16, 0.2), vec3(1.0, 0.82, 0.82), f * f);
        gl_FragColor = vec4(col * f * uIntensity, 1.0);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthFunc: THREE.LessEqualDepth,
  })
}

function makeAssets() {
  const dark = backdropTexture(false)
  const light = backdropTexture(true)
  // Abaixo do joelho do tone mapping Neutral (~0,76): acima dele o vermelho
  // refratado dessatura e o vidro vira rosa leitoso
  const backDark = new THREE.MeshBasicMaterial({ map: dark, depthWrite: false })
  backDark.color.setScalar(0.62)
  const backLight = new THREE.MeshBasicMaterial({ map: light, transparent: true, opacity: 0, depthWrite: false })
  const shadowTex = radialTexture([
    [0, "rgba(0,0,0,1)"],
    [0.45, "rgba(0,0,0,0.45)"],
    [1, "rgba(0,0,0,0)"],
  ])
  const shadow = new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.3, depthWrite: false })
  const ring = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
  ring.color.setRGB(1, 0.16, 0.2, THREE.LinearSRGBColorSpace)
  const sparkTex = radialTexture([
    [0, "rgba(255,255,255,1)"],
    [0.3, "rgba(255,255,255,0.35)"],
    [1, "rgba(255,255,255,0)"],
  ])
  const spark = new THREE.MeshBasicMaterial({
    map: sparkTex,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  })
  spark.color.setRGB(1, 0.3, 0.34, THREE.LinearSRGBColorSpace)
  const rim = fresnelMaterial()
  const plane = new THREE.PlaneGeometry(1, 1)
  const ringGeo = new THREE.RingGeometry(0.9, 1, 96)
  return {
    backDark,
    backLight,
    shadow,
    ring,
    spark,
    rim,
    plane,
    ringGeo,
    dispose() {
      for (const t of [dark, light, shadowTex, sparkTex]) t.dispose()
      for (const m of [backDark, backLight, shadow, ring, spark, rim]) m.dispose()
      plane.dispose()
      ringGeo.dispose()
    },
  }
}

/* ---------- Visível só numa das passadas ---------- */

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0)
/** Fora dos buffers da transmissão (halo, anel, fresnel, sombra). */
function onlyMainPass(this: THREE.Object3D, gl: THREE.WebGLRenderer) {
  if (gl.getRenderTarget() === null) return
  stash(this)
}
/** Só nos buffers da transmissão (o fundo que o vidro refrata). */
function onlyBuffers(this: THREE.Object3D, gl: THREE.WebGLRenderer) {
  if (gl.getRenderTarget() !== null) return
  stash(this)
}
function stash(o: THREE.Object3D) {
  const saved = (o.userData.saved ??= new THREE.Matrix4()) as THREE.Matrix4
  saved.copy(o.matrixWorld)
  o.matrixWorld.copy(ZERO)
  o.userData.hidden = true
}
function unstash(this: THREE.Object3D) {
  if (!this.userData.hidden) return
  this.matrixWorld.copy(this.userData.saved as THREE.Matrix4)
  this.userData.hidden = false
}

/** Espessura maior onde a superfície vira de lado (bevel e bordas): mais
 *  caminho dentro do vidro = vermelho mais fundo e refração mais forte. */
function patchEdgeThickness(m: THREE.Material | null) {
  if (!m || m.userData.edgePatched) return
  m.userData.edgePatched = true
  const base = m.onBeforeCompile
  m.onBeforeCompile = (shader, renderer) => {
    base.call(m, shader, renderer)
    shader.fragmentShader = shader.fragmentShader.replace(
      "material.thickness = thickness;",
      `float cgNdv = abs(dot(normalize(normal), normalize(vViewPosition)));
        material.thickness = thickness * (1.0 + 2.8 * pow(1.0 - cgNdv, 1.6));`,
    )
  }
  m.customProgramCacheKey = () => "cursor-glass-edge"
  m.needsUpdate = true
}

/* ---------- O cursor ---------- */

type Live = {
  stop: CompanionStop
  tip: Pt
  ang: number
  arrive: number
  scale: number
  sub: Element | null
}

function Companion({ onReady }: { onReady: () => void }) {
  const { nodes } = useGLTF(GLB, DRACO, false) as unknown as {
    nodes: Record<string, THREE.Object3D>
  }
  const geometry = (nodes.cursor_glass as THREE.Mesh).geometry
  const get = useThree((s) => s.get)
  const invalidate = useThree((s) => s.invalidate)
  const setFrameloop = useThree((s) => s.setFrameloop)
  const [assets] = useState(makeAssets)
  useEffect(() => () => assets.dispose(), [assets])

  const root = useRef<THREE.Group>(null)
  const pivot = useRef<THREE.Group>(null)
  const squash = useRef<THREE.Group>(null)
  const glass = useRef<THREE.Material | null>(null)
  const backDark = useRef<THREE.Mesh>(null)
  const backLight = useRef<THREE.Mesh>(null)
  const shadow = useRef<THREE.Mesh>(null)
  const ring = useRef<THREE.Mesh>(null)
  const spark = useRef<THREE.Mesh>(null)
  const rim = useRef<THREE.Mesh>(null)

  const st = useRef({
    started: false,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    z: 0,
    ang: NATURAL,
    angV: 0,
    tx: 0,
    ty: 0,
    txV: 0,
    tyV: 0,
    s: 100,
    tone: 0,
    press: 0,
    pressV: 0,
    ringT: -1,
    ringX: 0,
    ringY: 0,
    hold: -1,
    sub: null as Element | null,
    nextTap: 0,
    wakeUntil: 0,
    time: 0,
    awake: 1,
    camH: 0,
    ready: false,
    booted: false,
  })
  const input = useRef({ x: -1, y: -1, on: false })
  const els = useRef<{ map: Map<string, HTMLElement>; at: number }>({ map: new Map(), at: -1 })
  const timer = useRef(0)
  const show = useRef<HeroShow | null>(null)

  // Acordar: qualquer estímulo dá alguns segundos de quadro
  const wake = useRef(() => {})
  useEffect(() => {
    wake.current = () => {
      st.current.wakeUntil = performance.now() / 1000 + AWAKE
      invalidate()
    }
  }, [invalidate])

  // Monta invisível, compila os shaders sem travar e só então aparece
  useEffect(() => {
    let alive = true
    const run = async () => {
      const { gl, scene, camera } = get()
      if (!root.current) return
      await gl.compileAsync(root.current, camera, scene)
      if (!alive || !root.current) return
      root.current.visible = true
      st.current.booted = true
      wake.current()
    }
    run().catch(() => {
      // Sem compilação assíncrona: compila no primeiro quadro
      if (!alive || !root.current) return
      root.current.visible = true
      st.current.booted = true
      wake.current()
    })
    return () => {
      alive = false
    }
  }, [get])

  useEffect(() => {
    const I = input.current
    const S = st.current
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch" || !e.isTrusted) return
      show.current?.noteUser(performance.now() / 1000, e.clientX, e.clientY)
      I.x = e.clientX
      I.y = e.clientY
      I.on = true
      wake.current()
    }
    const onLeave = () => {
      I.on = false
      wake.current()
    }
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0 || !e.isTrusted) return
      tap(S)
      wake.current()
    }
    const onScroll = () => wake.current()
    const onVis = () => {
      if (document.hidden) setFrameloop("never")
      else {
        setFrameloop("demand")
        wake.current()
      }
    }
    // A vitrine do teclado acende outra tecla: acorda para apertar
    const mo = new MutationObserver(() => {
      if (S.hold >= 0 && COMPANION_STOPS[S.hold].tap?.onSubChange) wake.current()
    })
    const stage = document.querySelector('[data-companion="stack"]')
    if (stage) mo.observe(stage, { subtree: true, attributes: true, attributeFilter: ["data-sel"] })
    window.addEventListener("pointermove", onMove, { passive: true })
    document.documentElement.addEventListener("pointerleave", onLeave)
    window.addEventListener("pointerdown", onDown, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    document.addEventListener("visibilitychange", onVis)
    return () => {
      mo.disconnect()
      window.removeEventListener("pointermove", onMove)
      document.documentElement.removeEventListener("pointerleave", onLeave)
      window.removeEventListener("pointerdown", onDown)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      document.removeEventListener("visibilitychange", onVis)
      window.clearTimeout(timer.current)
      show.current?.pause()
    }
  }, [setFrameloop])

  useFrame((state, delta) => {
    const S = st.current
    if (!S.booted || !pivot.current || !squash.current) return
    const dt = Math.min(delta, 1 / 30)
    S.time += dt
    const t = S.time
    const now = performance.now() / 1000
    const W = state.size.width
    const H = state.size.height
    const I = input.current

    // 1 unidade = 1 px no plano z = 0
    if (S.camH !== H) {
      S.camH = H
      const cam = state.camera as THREE.PerspectiveCamera
      const D = H / 2 / TAN
      cam.position.set(0, 0, D)
      cam.near = D * 0.05
      cam.far = D * 4
      cam.updateProjectionMatrix()
    }

    // Alvos (re-busca de vez em quando: seções montam tarde)
    const E = els.current
    if (now - E.at > 1.5) {
      E.at = now
      E.map.clear()
      document.querySelectorAll<HTMLElement>("[data-companion]").forEach((el) => {
        const id = el.dataset.companion
        if (id && !E.map.has(id)) E.map.set(id, el)
      })
    }
    const s0 = clamp(H * 0.13, 92, 140)
    const live: Live[] = []
    for (const stop of COMPANION_STOPS) {
      const el = E.map.get(stop.id)
      if (!el || !el.isConnected) continue
      let r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      let sub: Element | null = null
      if (stop.sub) {
        sub = el.querySelector(stop.sub)
        const sr = sub?.getBoundingClientRect()
        if (sr && sr.width > 1) r = sr
        else sub = null
      }
      const spot = stop.spot ? document.querySelector(stop.spot)?.getBoundingClientRect() : null
      const sc = s0 * (stop.scale ?? 1)
      const tip = stop.tip(spot && spot.width > 1 ? spot : r, sc, W, H)
      const aim = stop.aim?.(r, sc)
      live.push({
        stop,
        tip,
        ang: aim ? NATURAL + clamp(wrap(Math.atan2(aim.y - tip.y, aim.x - tip.x) - NATURAL), -AIM_MAX, AIM_MAX) : NATURAL,
        arrive: smooth01((ENTER_FROM * H - tip.y) / ((ENTER_FROM - ENTER_TO) * H)),
        scale: sc,
        sub,
      })
    }
    if (!live.length) {
      pivot.current.visible = false
      return
    }
    pivot.current.visible = true

    // Parada atual (a última que já chegou) e a próxima
    let k = 0
    for (let i = 0; i < live.length; i++) if (live[i].arrive >= 0.999) k = i
    const A = live[k]
    const B = live[k + 1]
    const f = B ? B.arrive : 0
    const fe = f * f * (3 - 2 * f)
    const last = k === live.length - 1
    const clampTip = (p: Pt, free: boolean): Pt => ({
      x: clamp(p.x, W * 0.04, W * 0.96),
      y: free ? Math.min(p.y, H * BAND[1]) : clamp(p.y, H * BAND[0], H * BAND[1]),
    })
    const pa = clampTip(A.tip, last)
    let gx = pa.x
    let gy = pa.y
    let gAng = A.ang
    let gScale = A.scale
    let gTone: number = A.stop.tone
    let flight = 0
    if (B && f > 0) {
      const pb = clampTip(B.tip, false)
      // Curva: um arco para o lado de dentro da tela
      const dx = pb.x - pa.x
      const dy = pb.y - pa.y
      const len = Math.hypot(dx, dy) || 1
      const side = (pa.x + pb.x) / 2 > W / 2 ? -1 : 1
      const cx = (pa.x + pb.x) / 2 + (-dy / len) * len * 0.28 * side * Math.sign(dy || 1)
      const cy = (pa.y + pb.y) / 2 + (dx / len) * len * 0.28 * side * Math.sign(dy || 1)
      const u = 1 - fe
      gx = u * u * pa.x + 2 * u * fe * cx + fe * fe * pb.x
      gy = u * u * pa.y + 2 * u * fe * cy + fe * fe * pb.y
      gAng = lerpAngle(A.ang, B.ang, fe)
      gScale = A.scale + (B.scale - A.scale) * fe
      gTone = A.stop.tone + (B.stop.tone - A.stop.tone) * fe
      flight = Math.sin(Math.PI * fe)
    }
    const holdIdx = flight < 0.05 ? COMPANION_STOPS.indexOf((fe > 0.5 && B ? B : A).stop) : -1
    const held = holdIdx >= 0 ? (fe > 0.5 && B ? B : A) : null

    // Acordado: a flutuação morre suave antes do quadro parar
    const idleLeft = S.wakeUntil - now
    S.awake += ((idleLeft > 1.2 ? 1 : 0) - S.awake) * (1 - Math.exp(-dt * 2.2))
    const fl = S.awake * (held ? 1 : 0.3)

    // Hero: a coreografia dos botões e do nome (enquanto a hero está na
    // tela, parada e ninguém mexe nela)
    const SH = (show.current ??= new HeroShow())
    let staged = false
    if (held?.stop.id === "hero" && A.tip.y > 0 && A.tip.y < H) {
      const fr = SH.update(now, { x: S.x, y: S.y }, pa, A.ang, A.scale)
      if (fr) {
        staged = true
        gx = fr.tip.x
        gy = fr.tip.y
        gAng = fr.aim ?? NATURAL
        if (fr.tap) tap(S)
        S.wakeUntil = Math.max(S.wakeUntil, now + 1)
      }
    } else SH.pause()

    // Pouso: flutua, a ponta gira para o mouse (com limite)
    if (held && !staged) {
      gx += Math.sin(t * 0.83) * 3.2 * fl
      gy += Math.cos(t * 0.67 + 0.6) * 4.2 * fl
      if (I.on) {
        const m = Math.atan2(I.y - gy, I.x - gx)
        const near = clamp(1.4 - Math.hypot(I.x - gx, I.y - gy) / (W * 0.5), 0, 1)
        gAng += clamp(wrap(m - gAng), -0.42, 0.42) * near
        gAng = NATURAL + clamp(wrap(gAng - NATURAL), -AIM_MAX - 0.15, AIM_MAX + 0.15)
      }
      gAng += Math.sin(t * 0.55) * 0.05 * fl
    }

    // Parada nova: toques automáticos recomeçam
    if (holdIdx !== S.hold) {
      S.hold = holdIdx
      S.sub = held?.sub ?? null
      S.nextTap = now + 1.4
    }
    if (held) {
      const tp = held.stop.tap
      if (tp?.onSubChange && held.sub && held.sub !== S.sub) {
        if (S.sub) tap(S)
        S.sub = held.sub
      }
      if (tp?.every && now >= S.nextTap) {
        S.nextTap = now + tp.every
        tap(S)
        S.wakeUntil = Math.max(S.wakeUntil, now + 1.6)
      }
    }

    // Molas: posição (um tico solta, assenta com overshoot leve)
    if (!S.started) {
      S.started = true
      S.x = gx
      S.y = gy
      S.ang = gAng
      S.s = gScale
      S.tone = gTone
    }
    const kp = 90
    const cp = 2 * Math.sqrt(kp) * 0.82
    S.vx += ((gx - S.x) * kp - S.vx * cp) * dt
    S.vy += ((gy - S.y) * kp - S.vy * cp) * dt
    S.x += S.vx * dt
    S.y += S.vy * dt
    const speed = Math.hypot(S.vx, S.vy)
    // A ponta segue a direção do voo
    const tw = smooth01((speed - 140) / 900) * 0.85
    const target = tw > 0 ? lerpAngle(gAng, Math.atan2(S.vy, S.vx), tw) : gAng
    S.angV += (wrap(target - S.ang) * 70 - S.angV * 2 * Math.sqrt(70) * 0.8) * dt
    S.ang = wrap(S.ang + S.angV * dt)
    // Inclinação: velocidade (banking) + mouse
    let ttx = clamp(S.vy / 2200, -0.5, 0.5)
    let tty = clamp(S.vx / 1800, -0.6, 0.6)
    if (held && I.on) {
      ttx += clamp((I.y - S.y) / H, -1, 1) * 0.22
      tty += clamp((I.x - S.x) / W, -1, 1) * 0.3
    }
    S.txV += ((ttx - S.tx) * 50 - S.txV * 10) * dt
    S.tyV += ((tty - S.ty) * 50 - S.tyV * 10) * dt
    S.tx += S.txV * dt
    S.ty += S.tyV * dt
    S.s += (gScale * (1 + 0.12 * flight) - S.s) * (1 - Math.exp(-dt * 6))
    S.tone += (gTone - S.tone) * (1 - Math.exp(-dt * 5))
    S.z += (flight * 0.7 * S.s - S.z) * (1 - Math.exp(-dt * 6))
    // Toque: afunda e achata, volta com quique
    S.pressV += (-300 * S.press - 17 * S.pressV) * dt
    S.press = clamp(S.press + S.pressV * dt, -0.35, 1.2)

    // ---------- Aplica ----------
    const s = S.s
    const p = S.press
    const sa = -S.ang // ângulo no mundo (y para cima)
    // A ponta empurra para a frente no toque (na direção que mira)
    const px = S.x + Math.cos(S.ang) * p * 0.05 * s
    const py = S.y + Math.sin(S.ang) * p * 0.05 * s
    const wx = px - W / 2
    const wy = H / 2 - py
    const P = pivot.current
    P.position.set(wx, wy, S.z - p * 0.3 * s)
    TMP.qa.setFromAxisAngle(AX_Z, sa - TIP_WORLD)
    TMP.e.set(S.tx, S.ty, 0)
    TMP.qb.setFromEuler(TMP.e)
    P.quaternion.copy(TMP.qb).multiply(TMP.qa).multiply(POSE)
    squash.current.scale.set(s * (1 + 0.06 * p), s * (1 + 0.06 * p), s * (1 - 0.42 * p))

    // Centro da seta no mundo: fundo, sombra
    TMP.v.copy(CENTER).multiplyScalar(s).applyQuaternion(P.quaternion).add(P.position)
    const bd = backDark.current
    const bl = backLight.current
    if (bd && bl) {
      bd.position.set(TMP.v.x, TMP.v.y, TMP.v.z - s * 0.9)
      bd.scale.setScalar(s * 2.4)
      bl.position.set(TMP.v.x, TMP.v.y, TMP.v.z - s * 0.89)
      bl.scale.setScalar(s * 2.4)
      ;(bl.material as THREE.MeshBasicMaterial).opacity = S.tone
    }
    const sh = shadow.current
    if (sh) {
      sh.position.set(TMP.v.x + s * 0.1, TMP.v.y - s * 0.2, TMP.v.z - s * 0.5)
      sh.scale.set(s * 1.5, s * 1.3, 1)
      ;(sh.material as THREE.MeshBasicMaterial).opacity = (0.34 - 0.14 * S.tone) * (1 - 0.5 * flight)
    }
    // Vidro: atenuação proporcional ao tamanho (espessura em px)
    const g = glass.current as (THREE.Material & { attenuationDistance?: number }) | null
    if (g) g.attenuationDistance = s * 3
    const rm = rim.current?.material as THREE.ShaderMaterial | undefined
    if (rm) rm.uniforms.uIntensity.value = 0.6 + 0.3 * S.tone + 0.5 * Math.max(p, 0)

    // Anel de luz do toque
    const rg = ring.current
    const sp = spark.current
    if (rg && sp) {
      const ringMat = rg.material as THREE.MeshBasicMaterial
      const sparkMat = sp.material as THREE.MeshBasicMaterial
      if (S.ringT >= 0) {
        if (S.ringT === 0) {
          S.ringX = wx
          S.ringY = wy
        }
        S.ringT += dt
        const e = clamp(S.ringT / 0.62, 0, 1)
        const eo = 1 - (1 - e) ** 3
        rg.position.set(S.ringX, S.ringY, S.z + 2)
        rg.scale.setScalar(s * (0.1 + 0.62 * eo))
        ringMat.opacity = (1 - e) ** 1.5 * 0.95
        sp.position.set(S.ringX, S.ringY, S.z + 3)
        sp.scale.setScalar(s * (0.5 + 0.4 * eo))
        sparkMat.opacity = (1 - e) ** 2 * 0.9
        if (e >= 1) S.ringT = -1
      } else {
        ringMat.opacity = 0
        sparkMat.opacity = 0
      }
      rg.visible = sp.visible = S.ringT >= 0
    }

    if (!S.ready) {
      S.ready = true
      requestAnimationFrame(onReady)
    }

    // Continua enquanto houver estímulo recente ou mola andando
    const moving =
      Math.abs(gx - S.x) > 0.3 ||
      Math.abs(gy - S.y) > 0.3 ||
      speed > 2 ||
      Math.abs(S.angV) > 0.01 ||
      Math.abs(S.pressV) > 0.02 ||
      Math.abs(S.press) > 0.005 ||
      S.ringT >= 0 ||
      Math.abs(S.txV) + Math.abs(S.tyV) > 0.005 ||
      S.awake > 0.01
    if (now < S.wakeUntil || moving) state.invalidate()
    else if (held?.stop.tap?.every && !timer.current) {
      // Parado na tecla deploy: acorda para o próximo toque
      timer.current = window.setTimeout(
        () => {
          timer.current = 0
          wake.current()
        },
        Math.max(0, (S.nextTap - now) * 1000),
      )
    }
  })

  return (
    <group ref={root} visible={false}>
      {/* O fundo que o vidro refrata: só nos buffers da transmissão */}
      <mesh
        ref={backDark}
        geometry={assets.plane}
        material={assets.backDark}
        renderOrder={-2}
        onBeforeRender={onlyBuffers}
        onAfterRender={unstash}
      />
      <mesh
        ref={backLight}
        geometry={assets.plane}
        material={assets.backLight}
        renderOrder={-1}
        onBeforeRender={onlyBuffers}
        onAfterRender={unstash}
      />
      <mesh
        ref={shadow}
        geometry={assets.plane}
        material={assets.shadow}
        onBeforeRender={onlyMainPass}
        onAfterRender={unstash}
      />
      <group ref={pivot}>
        <group ref={squash}>
          <mesh geometry={geometry}>
            <MeshTransmissionMaterial
              ref={(m) => {
                const mat = m as unknown as THREE.Material | null
                glass.current = mat
                patchEdgeThickness(mat)
              }}
              samples={6}
              resolution={768}
              transmission={1}
              thickness={0.3}
              roughness={0.035}
              ior={1.5}
              chromaticAberration={0.06}
              anisotropicBlur={0.05}
              distortion={0.015}
              distortionScale={0.006}
              temporalDistortion={0}
              clearcoat={0.5}
              clearcoatRoughness={0.04}
              specularIntensity={1}
              color="#ffc7ca"
              attenuationColor="#e50914"
              attenuationDistance={170}
            />
          </mesh>
          <mesh
            ref={rim}
            geometry={geometry}
            material={assets.rim}
            renderOrder={5}
            onBeforeRender={onlyMainPass}
            onAfterRender={unstash}
          />
        </group>
      </group>
      <mesh
        ref={ring}
        geometry={assets.ringGeo}
        material={assets.ring}
        renderOrder={10}
        visible={false}
        onBeforeRender={onlyMainPass}
        onAfterRender={unstash}
      />
      <mesh
        ref={spark}
        geometry={assets.plane}
        material={assets.spark}
        renderOrder={11}
        visible={false}
        onBeforeRender={onlyMainPass}
        onAfterRender={unstash}
      />
    </group>
  )
}

/** Toque: o corpo afunda/achata e o anel de luz sai da ponta. */
function tap(S: { pressV: number; ringT: number }) {
  S.pressV += 10
  S.ringT = 0
}

const AX_Z = new THREE.Vector3(0, 0, 1)
const TMP = {
  qa: new THREE.Quaternion(),
  qb: new THREE.Quaternion(),
  e: new THREE.Euler(),
  v: new THREE.Vector3(),
}
