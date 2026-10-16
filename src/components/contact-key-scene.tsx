"use client"

import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react"
// Aviso "THREE.Clock: This module has been deprecated" no console (aqui e na
// hero): vem do próprio @react-three/fiber, que cria `clock: new THREE.Clock()`
// no store de todo <Canvas>. Conferido em out/2026: nenhuma 9.x usa
// THREE.Timer (a 9.8.2, latest, ainda usa Clock). Sem monkeypatch de console;
// some quando o R3F trocar o relógio.
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Environment, Lightformer, useGLTF } from "@react-three/drei"
import * as THREE from "three"

/**
 * Cena WebGL da tecla "deploy ↵" (public/3d/deploy.glb, exportada do
 * Blender). Câmera e luz vêm do manifest.json: em repouso a geometria cai
 * pixel a pixel em cima do render de fallback, então a troca poster → WebGL
 * não pula. Chegando pelo scroll, o keycap vem solto acima do switch e
 * encaixa com um clique (o LED pisca e sai a onda no piso do palco).
 * Carregada só no cliente (next/dynamic ssr:false) por `contact-key.tsx`.
 */

/** Estado que o wrapper escreve (sem re-render) e a cena lê a cada quadro. */
export type KeyInput = {
  /** Mouse em cima da tecla (ou foco): desce um pouco, o LED acorda. */
  hover: boolean
  /** Segurando (ponteiro ou Espaço): curso completo até o fundo. */
  down: boolean
  /** Aperto vindo de fora (Enter global ou Enter no link). */
  pulse: boolean
  /** Palco na tela: fora dela a cena dorme (frameloop "demand"). */
  visible: boolean
  /** Acorda o render (preenchido pela cena). */
  wake: () => void
}

type SceneProps = {
  inputRef: { current: KeyInput }
  /** Palco 7:5 de referência (ponteiro e progresso do scroll). */
  stageRef: { current: HTMLElement | null }
  /** Quanto o canvas sangra além do palco, em fração (0.2 = 20% por lado). */
  bleed: number
  onReady: () => void
  onLost: () => void
  /** A tecla bateu no fundo do curso (força 0–1). */
  onHit: (strength: number) => void
}

const GLB = "/3d/deploy.glb"
const DRACO = "/draco/"

// Câmera exata dos WebP (manifest.deploy.fallback_camera)
const CAM = {
  position: [0.0578, 0.0999, 0.1299] as const,
  quaternion: [-0.2859826, 0.1988269, 0.0607875, 0.9354072] as const,
  fov: 17.2028,
  shift: [-0.005341, -0.067785] as const,
}

// Curso da tecla (manifest.deploy.travel / states)
const KEY_UP_Y = 0.009263
const TRAVEL = 0.0036
// Antes de chegar, o keycap espera solto acima do switch (vista explodida)
const LIFT = 0.007
// Centro do palco em fração da altura da tela: abaixo de SEAT a tecla
// encaixa; acima de UNSEAT volta a soltar (histerese, sem tremer na borda)
const SEAT = 0.78
const UNSEAT = 1.02
// Queda do keycap em câmera lenta: ~0,26 s do alto até o switch
const GRAVITY = 30

// Luz: um Lightformer por luz de área do Blender (manifest.deploy.lights)
const LIGHTS = [
  { color: "#fffcf8", position: [-5.1702, 7.4181, 4.271], scale: [6.7437, 4.4958], intensity: 12.7234 },
  { color: "#ffffff", position: [1.1523, 8.6423, -4.8973], scale: [10.3707, 1.1523], intensity: 9.0885 },
  { color: "#ff2430", position: [4.4233, 1.4744, -8.8465], scale: [5.013, 1.4744], intensity: 79.4277 },
  { color: "#ff3038", position: [-5.2534, 0.8756, -8.4638], scale: [4.086, 1.2842], intensity: 52.8008 },
  { color: "#cee2ff", position: [7.6207, 0.5862, 6.4483], scale: [8.7932, 8.7932], intensity: 0.4035 },
] as const

/**
 * Câmera do Blender com o canvas maior que o palco: o fov e o shift são
 * reescalados para o palco continuar no mesmo lugar, e a tecla pode
 * inclinar e subir além da moldura sem ser cortada.
 */
function makeCamera(bleed: number) {
  const k = 1 + 2 * bleed
  const half = THREE.MathUtils.degToRad(CAM.fov) / 2
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(half) * k))
  const cam = new THREE.PerspectiveCamera(fov, 1.4, 0.01, 2)
  cam.position.set(...CAM.position)
  cam.quaternion.set(...CAM.quaternion)
  // Shift do Blender é relativo ao maior lado do quadro (aqui, a largura)
  cam.setViewOffset(1400, 1000, (CAM.shift[0] / k) * 1400, (-CAM.shift[1] / k) * 1400, 1400, 1000)
  cam.updateProjectionMatrix()
  return cam
}

export default function ContactKeyScene({
  inputRef,
  stageRef,
  bleed,
  onReady,
  onLost,
  onHit,
}: SceneProps) {
  const camera = useMemo(() => makeCamera(bleed), [bleed])
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        // "Khronos PBR Neutral": o mesmo tone mapping dos renders
        toneMapping: THREE.NeutralToneMapping,
        toneMappingExposure: 1,
      }}
      camera={camera}
      style={{ pointerEvents: "none" }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener("webglcontextlost", onLost, { once: true })
      }}
    >
      <Environment resolution={256} frames={1}>
        {LIGHTS.map((l) => (
          <Lightformer
            key={l.color + l.intensity}
            form="rect"
            color={l.color}
            intensity={l.intensity}
            position={[...l.position]}
            scale={[...l.scale]}
            target={[0, 0, 0]}
          />
        ))}
      </Environment>
      <Suspense fallback={null}>
        <DeployKey inputRef={inputRef} stageRef={stageRef} onReady={onReady} onHit={onHit} />
      </Suspense>
    </Canvas>
  )
}

type Spring = { x: number; v: number }

/** Mola amortecida (Euler semi-implícito; o chamador faz os subpassos). */
function step(s: Spring, target: number, k: number, zeta: number, dt: number) {
  const a = -k * (s.x - target) - 2 * zeta * Math.sqrt(k) * s.v
  s.v += a * dt
  s.x += s.v * dt
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (x: number) => x * x * (3 - 2 * x)

/** Peças que animam; o LED vira decal aditivo (manifest.deploy_led). */
function rigModel(scene: THREE.Object3D) {
  const mats = new Map<string, THREE.MeshStandardMaterial>()
  scene.traverse((o) => {
    if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshStandardMaterial) {
      mats.set(o.material.name, o.material)
    }
  })
  const led = mats.get("led_glow")
  if (led) {
    led.blending = THREE.AdditiveBlending
    led.depthWrite = false
    // Só a emissão soma: a cor base (branca no glTF) refletiria o ambiente
    // e tingiria a placa inteira de vermelho, diferente do render
    led.color.setScalar(0)
    led.needsUpdate = true
  }
  // O env map não tem oclusão: debaixo do keycap o switch e os
  // estabilizadores refletiriam a rim vermelha como se nada os cobrisse
  const housing = mats.get("switch_housing")
  if (housing) housing.envMapIntensity = 0.15
  const stab = mats.get("stab_housing")
  if (stab) stab.envMapIntensity = 0.3
  return {
    key: scene.getObjectByName("deploy_key"),
    led,
    legend: mats.get("legend_deploy"),
    housing,
  }
}

function DeployKey({
  inputRef,
  stageRef,
  onReady,
  onHit,
}: Pick<SceneProps, "inputRef" | "stageRef" | "onReady" | "onHit">) {
  const gltf = useGLTF(GLB, DRACO)
  const invalidate = useThree((s) => s.invalidate)
  const root = useRef<THREE.Group>(null)
  // Fica num ref: o useFrame mexe nas peças a cada quadro
  const partsRef = useRef<ReturnType<typeof rigModel> | null>(null)
  useLayoutEffect(() => {
    partsRef.current = rigModel(gltf.scene)
  }, [gltf.scene])

  // Física e leitura do ponteiro ficam em refs: nada disso re-renderiza
  const simRef = useRef({
    depth: { x: 0, v: 0 } as Spring,
    thump: { x: 0, v: 0 } as Spring,
    yaw: { x: 0, v: 0 } as Spring,
    pitch: { x: 0, v: 0 } as Spring,
    /** Centro do palco / altura da tela, suavizado. */
    view: { x: 0, v: 0 } as Spring,
    /** Keycap solto: 0 = encaixado no switch, 1 = LIFT acima. */
    seat: { x: 0, v: 0 } as Spring,
    lifted: false,
    // Última posição do mouse na tela: relida a cada quadro contra o palco,
    // então a tecla segue o cursor também quando a página rola
    client: { x: 0, y: 0, has: false },
    flash: 0,
    hit: 0,
    init: false,
    ready: false,
  })

  // O wrapper acorda a cena a cada evento; ponteiro e scroll também
  useEffect(() => {
    const s = simRef.current
    const input = inputRef.current
    input.wake = invalidate
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return
      s.client.x = e.clientX
      s.client.y = e.clientY
      s.client.has = true
      if (input.visible) invalidate()
    }
    const onScroll = () => {
      if (input.visible) invalidate()
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("pointermove", onMove)
      window.removeEventListener("scroll", onScroll)
    }
  }, [inputRef, invalidate])

  useFrame((_, delta) => {
    const s = simRef.current
    const g = root.current
    const parts = partsRef.current
    if (!g || !parts?.key) return
    const { key, led, legend, housing } = parts
    const i = inputRef.current

    // Onde o palco está na tela (centro / altura) e para onde o mouse aponta,
    // normalizado pelo palco e saturado: longe dele a tecla só "olha"
    let view = s.view.x
    let px = 0
    let py = 0
    const el = stageRef.current
    if (el) {
      const r = el.getBoundingClientRect()
      const cy = r.top + r.height / 2
      view = cy / window.innerHeight
      if (s.client.has) {
        px = Math.tanh(((s.client.x - (r.left + r.width / 2)) / r.width) * 1.6)
        py = Math.tanh(((s.client.y - cy) / r.height) * 1.6)
      }
    }

    // Primeiro quadro: já na tela, começa montada (bate com o poster);
    // abaixo da dobra, começa solta e encaixa quando o palco chegar
    if (!s.init) {
      s.init = true
      s.view.x = view
      s.lifted = view > SEAT
      s.seat.x = s.lifted ? 1 : 0
    }

    // Alvo do curso: hover = um pouco; aperto = além do fundo (bate no batente)
    const pressing = i.down || i.pulse
    const target = pressing ? 1.3 : i.hover ? 0.24 : 0

    // Encaixe com histerese; apertar a tecla solta também encaixa na hora
    if (s.lifted && (view < SEAT || pressing)) s.lifted = false
    else if (!s.lifted && !pressing && view > UNSEAT) s.lifted = true

    const dt = Math.min(delta, 1 / 30)
    const n = Math.ceil(dt / (1 / 240))
    const h = dt / n
    for (let j = 0; j < n; j++) {
      const d = s.depth
      // Descida rápida e firme; volta com mola (um pouco de quique)
      if (target > d.x) step(d, target, 1700, 0.8, h)
      else step(d, target, 420, 0.4, h)
      // Fundo do curso: batente duro. A velocidade vira "impacto"
      if (d.x > 1) {
        if (d.v > 3) {
          const hit = Math.min(1, d.v / 14)
          s.flash = Math.max(s.flash, hit)
          s.thump.v += hit * 2.2
          s.hit = Math.max(s.hit, hit)
        }
        d.x = 1
        d.v = Math.min(0, d.v)
      }
      // Topo: o stem bate na carcaça e devolve só um pouco
      if (d.x < -0.1) {
        d.x = -0.1
        d.v = Math.abs(d.v) * 0.18
      }

      // Keycap: sobe macio; desce caindo (gravidade) e quica no stem
      const k = s.seat
      if (s.lifted) step(k, 1, 70, 1, h)
      else if (k.x > 0 || k.v > 0) {
        k.v -= GRAVITY * h
        k.x += k.v * h
        if (k.x <= 0) {
          const impact = -k.v
          k.x = 0
          k.v = impact > 2 ? impact * 0.2 : 0
          // Só a queda de verdade "clica": empurra o switch, pisca o LED
          // e solta a onda no piso (o quique pequeno, não)
          if (impact > 4) {
            const hit = Math.min(1, impact / 8)
            d.v += impact * (LIFT / TRAVEL) * 0.6
            s.thump.v += hit * 1.4
            s.flash = Math.max(s.flash, 0.65 * hit)
            s.hit = Math.max(s.hit, 0.6 * hit)
          }
        }
      }

      step(s.thump, 0, 900, 0.3, h)
      step(s.yaw, px, 55, 0.75, h)
      step(s.pitch, py, 55, 0.75, h)
      step(s.view, view, 140, 1, h)
    }
    s.flash *= Math.exp(-dt * 5)
    // Batida no fundo: avisa o wrapper (onda no piso do palco)
    if (s.hit > 0) {
      onHit(s.hit)
      s.hit = 0
    }

    // Scroll: entrando por baixo a peça vem girada; saindo por cima, gira
    // de leve para o outro lado. No meio, só o mouse mexe nela
    const v = s.view.x
    const away = smooth(clamp01((v - SEAT) / (1.32 - SEAT)))
    const past = smooth(clamp01((0.48 - v) / 0.7))

    // Pose: inclina seguindo o mouse. Para cima inclina menos: a placa
    // pegaria o reflexo da rim vermelha inteira e viraria um bloco vermelho
    const tilt = s.pitch.x < 0 ? 0.06 : 0.11
    g.rotation.set(
      s.pitch.x * tilt - away * 0.24 + past * 0.12 + s.thump.x * 0.25,
      s.yaw.x * 0.2 - away * 0.45 + past * 0.2,
      -s.yaw.x * 0.05,
    )
    g.position.y = -s.thump.x * 0.006 - away * 0.003

    const depth = s.depth.x
    key.position.y = KEY_UP_Y - depth * TRAVEL + s.seat.x * LIFT

    // Luz: o LED vaza por baixo conforme a tecla desce. Em repouso fica
    // abaixo do manifest (0,12): sem a oclusão do Cycles ele espalha mais
    const lit = clamp01(depth) ** 1.3
    if (led) led.emissiveIntensity = 0.07 + 1.03 * lit + s.flash * 0.9
    if (legend) legend.emissiveIntensity = 1 + 7 * lit ** 1.4 + s.flash * 2.5
    if (housing) housing.emissiveIntensity = 1 + 11 * lit + s.flash * 6

    // Continua desenhando só enquanto algo se mexe
    const moving =
      Math.abs(s.depth.v) > 1e-3 ||
      Math.abs(s.depth.x - Math.min(1, target)) > 1e-3 ||
      Math.abs(s.thump.v) + Math.abs(s.thump.x) > 1e-4 ||
      Math.abs(s.yaw.v) + Math.abs(s.yaw.x - px) > 1e-4 ||
      Math.abs(s.pitch.v) + Math.abs(s.pitch.x - py) > 1e-4 ||
      Math.abs(s.view.v) + Math.abs(s.view.x - view) > 1e-4 ||
      Math.abs(s.seat.v) + Math.abs(s.seat.x - (s.lifted ? 1 : 0)) > 1e-4 ||
      s.flash > 2e-3
    if (moving && i.visible) invalidate()

    if (!s.ready) {
      s.ready = true
      // Espera o quadro chegar à tela antes de trocar o poster pelo canvas
      requestAnimationFrame(() => onReady())
    }
  })

  return (
    <group ref={root}>
      <primitive object={gltf.scene} />
    </group>
  )
}

useGLTF.preload(GLB, DRACO)
