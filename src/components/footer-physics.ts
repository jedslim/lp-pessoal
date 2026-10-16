import type MatterNS from "matter-js"
import type { Spot } from "@/components/footer-keys"

/*
 * Mundo de física das teclas do rodapé (matter-js, carregado sob demanda).
 * Sem renderer do matter: cada corpo move um elemento do DOM (transform e
 * a luz da keycap, recalculada para o ângulo, via `paint`).
 *
 * Passo fixo de 1/60 s com acumulador. O laço só roda enquanto há algo se
 * mexendo, alguém arrastando ou o mouse empurrando, e só com o rodapé na
 * tela; parado, não gasta nada.
 */

type Matter = typeof MatterNS
type Body = MatterNS.Body

const STEP = 1000 / 60
const WALL = 600
/** Teto de velocidade (px/passo) e de giro (rad/passo): nada atravessa parede. */
const MAX_SPEED = 36
const MAX_SPIN = 0.32

const CAT_WALL = 0x0001
const CAT_KEY = 0x0002
const CAT_CEIL = 0x0004
const CAT_PUSH = 0x0008

export type PhysKey = {
  id: string
  el: HTMLElement
  /** Largura e altura em px. */
  w: number
  h: number
  /** Teclas do teclado físico que fazem esta pular. */
  keys: string[]
  /** Reacende a tecla para o ângulo `a` (rad); `lift` 1 = agarrada. */
  paint: (a: number, lift: number) => void
}

export type Geometry = { width: number; floor: number; u: number }

type Item = PhysKey & {
  body: Body
  /** Já entrou no palco (passa a bater no teto). */
  inside: boolean
  lx: number
  ly: number
  la: number
  aa: number
  lift: number
}

type Tween = {
  from: Spot & { a: number }
  to: Spot & { a: number }
  start: number
  dur: number
  lift: number
}

type Drag = {
  item: Item
  c: MatterNS.Constraint
  air: number
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 4)
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

export class KeyWorld {
  private M: Matter
  private engine: MatterNS.Engine
  private items: Item[] = []
  private floor?: Body
  private left?: Body
  private right?: Body
  private ceil?: Body
  private pusher: Body
  private geo: Geometry
  private drag: Drag | null = null
  private tweens = new Map<Item, Tween>()
  private pointer: Spot | null = null
  private pointerAt = 0
  private raf = 0
  private last = 0
  private acc = 0
  private calm = 0
  private visible = false
  private now = 0
  /** Chamado quando a arrumação em curso termina. */
  private arrangedCb?: () => void
  /** O mouse empurrou alguma tecla. */
  onPush?: () => void
  /** Uma tecla bateu no chão (x em px; força 0–1). */
  onImpact?: (x: number, strength: number) => void

  constructor(M: Matter, keys: PhysKey[], geo: Geometry) {
    this.M = M
    this.geo = geo
    this.engine = M.Engine.create({
      gravity: { x: 0, y: 1, scale: 0.0014 },
      positionIterations: 10,
      velocityIterations: 8,
      enableSleeping: false,
    })
    this.placeWalls()
    // Empurrador do mouse: um disco pesado que segue o cursor e só bate nas teclas
    this.pusher = M.Bodies.circle(-9999, -9999, geo.u * 0.26, {
      density: 0.02,
      frictionAir: 0,
      friction: 0.05,
      restitution: 0.1,
      inertia: Infinity,
      collisionFilter: { category: CAT_PUSH, mask: 0 },
    })
    M.Composite.add(this.engine.world, this.pusher)
    // Antes da resolução: a velocidade ainda é a de chegada
    M.Events.on(this.engine, "collisionStart", (ev) => {
      for (const pair of ev.pairs) {
        const a = pair.bodyA
        const b = pair.bodyB
        if (a === this.pusher || b === this.pusher) {
          this.onPush?.()
          continue
        }
        const key = a === this.floor ? b : b === this.floor ? a : null
        if (!key || key.isStatic || !this.onImpact) continue
        const vy = key.velocity.y
        if (vy > 3.2) this.onImpact(key.position.x, Math.min(1, vy / 16))
      }
    })

    for (const k of keys) {
      const body = M.Bodies.rectangle(-9999, -9999, k.w, k.h, {
        chamfer: { radius: Math.min(k.w, k.h) * 0.16 },
        density: 0.0016,
        friction: 0.55,
        frictionStatic: 0.8,
        frictionAir: 0.012,
        restitution: 0.18,
        slop: 0.04,
        collisionFilter: { category: CAT_KEY, mask: CAT_WALL | CAT_KEY | CAT_PUSH },
      })
      M.Composite.add(this.engine.world, body)
      this.items.push({ ...k, body, inside: false, lx: NaN, ly: NaN, la: NaN, aa: NaN, lift: 0 })
    }
    // Fora de cena até a queda (ou até `place`)
    this.render(true)
  }

  /* ---------- Paredes ---------- */

  /**
   * Chão, paredes (altas, para as teclas que nascem acima do palco) e teto.
   * Recriadas a cada mudança de geometria: `setVertices` num corpo estático
   * daria massa finita a ele.
   */
  private placeWalls() {
    const { Bodies, Composite } = this.M
    const { width: W, floor: F } = this.geo
    const world = this.engine.world
    const old = [this.floor, this.left, this.right, this.ceil].filter(
      (b): b is Body => !!b,
    )
    if (old.length) Composite.remove(world, old)
    const opts = (cat: number) => ({
      isStatic: true,
      friction: 0.6,
      restitution: 0.1,
      collisionFilter: { category: cat, mask: CAT_KEY },
    })
    const tall = F + 4000
    this.floor = Bodies.rectangle(W / 2, F + WALL / 2, W + WALL * 2, WALL, opts(CAT_WALL))
    this.left = Bodies.rectangle(-WALL / 2, F - tall / 2, WALL, tall, opts(CAT_WALL))
    this.right = Bodies.rectangle(W + WALL / 2, F - tall / 2, WALL, tall, opts(CAT_WALL))
    this.ceil = Bodies.rectangle(W / 2, -WALL / 2, W + WALL * 2, WALL, opts(CAT_CEIL))
    Composite.add(world, [this.floor, this.left, this.right, this.ceil])
  }

  /** Chão subiu ou desceu (altura do rodapé mudou, mesma largura). */
  setFloor(floor: number) {
    const dy = floor - this.geo.floor
    if (Math.abs(dy) < 0.5) return
    this.geo = { ...this.geo, floor }
    this.placeWalls()
    for (const it of this.items) {
      this.M.Body.translate(it.body, { x: 0, y: dy })
    }
    this.render(true)
    this.wake()
  }

  /* ---------- Estados ---------- */

  /** Teclas paradas nos lugares dados (sem queda). */
  place(spots: Map<string, Spot>) {
    const { Body } = this.M
    for (const it of this.items) {
      const s = spots.get(it.id)
      if (!s) continue
      Body.setPosition(it.body, s)
      Body.setAngle(it.body, 0)
      Body.setVelocity(it.body, { x: 0, y: 0 })
      Body.setAngularVelocity(it.body, 0)
      this.enter(it)
    }
    this.render(true)
  }

  /** Solta as teclas de cima do palco, espalhadas, uma atrás da outra. */
  drop(order: string[]) {
    const { Body } = this.M
    const { width: W, u } = this.geo
    const ordered = [...this.items].sort(
      (a, b) => order.indexOf(a.id) - order.indexOf(b.id),
    )
    const margin = u * 0.9
    ordered.forEach((it, i) => {
      // Razão áurea: posições bem distribuídas, sem duas caindo no mesmo lugar
      const f = (i * 0.618034 + 0.17) % 1
      const x = clamp(margin + f * (W - margin * 2), it.w / 2 + 4, W - it.w / 2 - 4)
      const y = -it.h - i * u * 0.62 - Math.random() * u * 0.3
      Body.setPosition(it.body, { x, y })
      // Pouco giro: a maioria assenta de pé (legível); as que batem de quina tombam
      Body.setAngle(it.body, (Math.random() - 0.5) * 0.5)
      Body.setVelocity(it.body, { x: (Math.random() - 0.5) * 3, y: 2 + Math.random() * 3 })
      Body.setAngularVelocity(it.body, (Math.random() - 0.5) * 0.012)
      it.inside = false
      it.body.collisionFilter.mask = CAT_WALL | CAT_KEY | CAT_PUSH
    })
    this.render(true)
    this.wake()
  }

  /** Voa cada tecla até o lugar dela, em arco, e assenta. */
  arrange(spots: Map<string, Spot>, onDone?: () => void) {
    const { Body } = this.M
    this.release()
    this.setPointer(null)
    const start = performance.now()
    // Fileira de baixo primeiro; dentro dela, da esquerda para a direita
    const ordered = [...this.items].sort((a, b) => {
      const sa = spots.get(a.id)!
      const sb = spots.get(b.id)!
      return sb.y - sa.y || sa.x - sb.x
    })
    ordered.forEach((it, i) => {
      const to = spots.get(it.id)
      if (!to) return
      const b = it.body
      Body.setStatic(b, true)
      // Gira pelo caminho mais curto até ficar reta
      const turns = Math.round(b.angle / (Math.PI * 2))
      this.tweens.set(it, {
        from: { x: b.position.x, y: b.position.y, a: b.angle },
        to: { ...to, a: turns * Math.PI * 2 },
        start: start + i * 55,
        dur: 820,
        lift: this.geo.u * (0.9 + (i % 3) * 0.25),
      })
    })
    this.arrangedCb = onDone
    this.wake()
  }

  /** Explode a arrumação: tudo para cima, girando. */
  scatter() {
    const { Body } = this.M
    this.finishTweens()
    const k = Math.sqrt(this.geo.u / 100)
    for (const it of this.items) {
      Body.setVelocity(it.body, {
        x: (Math.random() - 0.5) * 18 * k,
        y: -(13 + Math.random() * 9) * k,
      })
      Body.setAngularVelocity(it.body, (Math.random() - 0.5) * 0.45)
    }
    this.wake()
  }

  /** A tecla pula (tecla do teclado físico ou toque rápido). */
  hop(match: (it: PhysKey) => boolean) {
    const { Body } = this.M
    if (this.tweens.size) return false
    const k = Math.sqrt(this.geo.u / 100)
    let any = false
    for (const it of this.items) {
      if (!match(it) || this.drag?.item === it) continue
      any = true
      Body.setVelocity(it.body, {
        x: it.body.velocity.x * 0.3 + (Math.random() - 0.5) * 4 * k,
        y: -(11.5 + Math.random() * 3) * k,
      })
      Body.setAngularVelocity(it.body, (Math.random() - 0.5) * 0.28)
    }
    if (any) this.wake()
    return any
  }

  get busy() {
    return this.tweens.size > 0
  }

  /* ---------- Arrastar ---------- */

  grab(id: string, x: number, y: number) {
    const { Constraint, Composite } = this.M
    if (this.tweens.size) return false
    const item = this.items.find((it) => it.id === id)
    if (!item) return false
    this.release()
    const b = item.body
    const c = Constraint.create({
      pointA: { x, y },
      bodyB: b,
      pointB: { x: x - b.position.x, y: y - b.position.y },
      length: 0.01,
      stiffness: 0.16,
      damping: 0.08,
    })
    Composite.add(this.engine.world, c)
    // Pendurada, balança menos que solta
    this.drag = { item, c, air: b.frictionAir }
    b.frictionAir = 0.06
    this.setPointer(null)
    this.wake()
    return true
  }

  moveGrab(x: number, y: number) {
    if (!this.drag) return
    const { width: W, floor: F } = this.geo
    this.drag.c.pointA.x = clamp(x, 0, W)
    this.drag.c.pointA.y = clamp(y, 0, F)
    this.wake()
  }

  release() {
    if (!this.drag) return
    this.M.Composite.remove(this.engine.world, this.drag.c)
    this.drag.item.body.frictionAir = this.drag.air
    this.drag = null
    this.wake()
  }

  /* ---------- Empurrar com o mouse ---------- */

  /**
   * Cursor do mouse (sem botão apertado). Só empurra no gesto rápido: quem
   * chega devagar numa tecla consegue agarrá-la sem que ela fuja.
   */
  setPointer(p: Spot | null) {
    const push = this.pusher
    const t = performance.now()
    if (!p || this.drag || this.tweens.size) {
      if (this.pointer) {
        this.setPushing(false)
        this.M.Body.setPosition(push, { x: -9999, y: -9999 })
        this.M.Body.setVelocity(push, { x: 0, y: 0 })
      }
      this.pointer = null
      return
    }
    if (!this.pointer) {
      // Entra no lugar do cursor, sem velocidade (não dá tranco em ninguém)
      this.M.Body.setPosition(push, p)
      this.M.Body.setVelocity(push, { x: 0, y: 0 })
      this.setPushing(false)
    } else {
      const v =
        Math.hypot(p.x - this.pointer.x, p.y - this.pointer.y) /
        Math.max(4, t - this.pointerAt)
      // px/ms, com histerese: liga acima de 0,8 e desliga abaixo de 0,4
      this.setPushing(v > (this.pushing ? 0.4 : 0.8))
    }
    this.pointer = { ...p }
    this.pointerAt = t
    this.wake()
  }

  private pushing = false
  private setPushing(on: boolean) {
    if (on === this.pushing) return
    this.pushing = on
    this.pusher.collisionFilter.mask = on ? CAT_KEY : 0
  }

  /* ---------- Laço ---------- */

  setVisible(v: boolean) {
    this.visible = v
    if (v) this.wake()
    else this.halt()
  }

  wake() {
    this.calm = 0
    if (this.raf || !this.visible) return
    this.last = 0
    this.acc = 0
    this.raf = requestAnimationFrame(this.frame)
  }

  private halt() {
    cancelAnimationFrame(this.raf)
    this.raf = 0
  }

  private frame = (now: number) => {
    this.raf = 0
    if (!this.visible) return
    const dt = this.last ? Math.min(64, now - this.last) : STEP
    this.last = now
    this.acc += dt
    let n = 0
    while (this.acc >= STEP && n < 4) {
      this.now = now
      this.step()
      this.acc -= STEP
      n++
    }
    if (n === 4) this.acc = 0
    this.render(false)
    const pointerLive = this.pointer && now - this.pointerAt < 400
    if (this.drag || this.tweens.size || pointerLive || this.calm < 50) {
      this.raf = requestAnimationFrame(this.frame)
    }
  }

  private step() {
    const { Body, Engine } = this.M
    const { width: W, floor: F, u } = this.geo

    // Empurrador vai atrás do cursor com velocidade (o resolvedor transfere
    // o movimento); se o cursor saltou longe, teleporta sem velocidade
    // Mouse parado: para de empurrar
    if (this.pushing && this.now - this.pointerAt > 120) this.setPushing(false)
    if (this.pointer) {
      const p = this.pusher.position
      const dx = this.pointer.x - p.x
      const dy = this.pointer.y - p.y
      if (Math.hypot(dx, dy) > u * 3) {
        Body.setPosition(this.pusher, this.pointer)
        Body.setVelocity(this.pusher, { x: 0, y: 0 })
      } else {
        Body.setVelocity(this.pusher, {
          x: clamp(dx * 0.5, -MAX_SPEED, MAX_SPEED),
          y: clamp(dy * 0.5, -MAX_SPEED, MAX_SPEED),
        })
      }
    } else {
      // Fora de cena e parado (sem isso a gravidade o levaria embora)
      Body.setPosition(this.pusher, { x: -9999, y: -9999 })
      Body.setVelocity(this.pusher, { x: 0, y: 0 })
    }

    // Arrumação: corpos estáticos levados por interpolação, em arco
    if (this.tweens.size) {
      let done = 0
      for (const [it, tw] of this.tweens) {
        const t = clamp((this.now - tw.start) / tw.dur, 0, 1)
        const e = easeOut(t)
        const arc = Math.sin(Math.PI * Math.min(1, t * 1.15)) * tw.lift
        Body.setPosition(it.body, {
          x: tw.from.x + (tw.to.x - tw.from.x) * e,
          y: tw.from.y + (tw.to.y - tw.from.y) * e - arc,
        })
        Body.setAngle(it.body, tw.from.a + (tw.to.a - tw.from.a) * e)
        if (t >= 1) done++
      }
      if (done === this.tweens.size) this.finishTweens(true)
    }

    Engine.update(this.engine, STEP)

    let moving = false
    for (const it of this.items) {
      const b = it.body
      if (b.isStatic) {
        moving = true
        continue
      }
      // Teto de velocidade: arremesso forte não atravessa parede
      if (b.speed > MAX_SPEED) {
        const s = MAX_SPEED / b.speed
        Body.setVelocity(b, { x: b.velocity.x * s, y: b.velocity.y * s })
      }
      if (Math.abs(b.angularVelocity) > MAX_SPIN) {
        Body.setAngularVelocity(b, Math.sign(b.angularVelocity) * MAX_SPIN)
      }
      if (!it.inside && b.bounds.min.y > 2) this.enter(it)
      // Resgate: se algo escapou (ou virou NaN), volta pelo alto
      const { x, y } = b.position
      if (!Number.isFinite(x) || !Number.isFinite(y) || y > F + u || x < -u || x > W + u) {
        Body.setPosition(b, { x: W / 2, y: u })
        Body.setVelocity(b, { x: 0, y: 0 })
        Body.setAngularVelocity(b, 0)
      }
      if (b.speed > 0.12 || Math.abs(b.angularVelocity) > 0.003) moving = true
    }
    this.calm = moving ? 0 : this.calm + 1
  }

  /** Dentro do palco: passa a bater no teto. */
  private enter(it: Item) {
    it.inside = true
    it.body.collisionFilter.mask = CAT_WALL | CAT_KEY | CAT_PUSH | CAT_CEIL
  }

  private finishTweens(arrived = false) {
    if (!this.tweens.size) return
    const { Body } = this.M
    for (const [it, tw] of this.tweens) {
      if (arrived) {
        Body.setPosition(it.body, tw.to)
        Body.setAngle(it.body, tw.to.a)
      }
      Body.setStatic(it.body, false)
      Body.setVelocity(it.body, { x: 0, y: 0 })
      Body.setAngularVelocity(it.body, 0)
      this.enter(it)
    }
    this.tweens.clear()
    const cb = this.arrangedCb
    this.arrangedCb = undefined
    if (arrived) cb?.()
  }

  /* ---------- Desenho ---------- */

  private render(force: boolean) {
    const held = this.drag?.item
    for (const it of this.items) {
      const { x, y } = it.body.position
      const a = it.body.angle
      const lift = it === held ? 1 : 0
      // A luz só é refeita a cada ~2° de giro (o erro some a olho nu): menos
      // recálculo de estilo e menos repintura de sombra; entre um e outro, a
      // tecla só se move por transform, sem repintar
      if (force || lift !== it.lift || !(Math.abs(a - it.aa) < 0.035)) {
        it.aa = a
        it.lift = lift
        it.paint(a, lift)
      }
      if (
        !force &&
        Math.abs(x - it.lx) < 0.05 &&
        Math.abs(y - it.ly) < 0.05 &&
        Math.abs(a - it.la) < 0.0005
      )
        continue
      it.lx = x
      it.ly = y
      it.la = a
      it.el.style.transform = `translate3d(${(x - it.w / 2).toFixed(2)}px, ${(y - it.h / 2).toFixed(2)}px, 0) rotate(${a.toFixed(4)}rad)`
    }
  }

  destroy() {
    this.halt()
    this.M.Composite.clear(this.engine.world, false)
    this.M.Engine.clear(this.engine)
    this.items = []
  }
}
