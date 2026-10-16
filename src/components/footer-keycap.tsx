import type { CSSProperties, Ref } from "react"
import type { KeySpec, KeyTone } from "@/components/footer-keys"
import { cn } from "@/lib/utils"

/*
 * Keycap em CSS, vista de cima, no visual dos renders do Blender: grafite
 * com aresta viva e rim vermelho, ou vermelha (o TEC do logo).
 *
 * A física gira a tecla inteira, mas a luz não pode girar junto: o gradiente,
 * a sombra, o rim e o deslocamento do tampo são recalculados para o ângulo
 * atual (`keyLight`), de modo que a luz vem sempre de cima, a sombra cai
 * sempre para baixo e o rim acende sempre na aresta voltada para o chão.
 * O cálculo é em JS e escreve só nas duas camadas acesas: nada de variável
 * herdada que obrigue o navegador a recalcular a tecla inteira a cada quadro.
 *
 * Medidas em `var(--u)` (1u em px, definido pelo palco). Agarrada
 * (`data-held`), a tecla cresce num invólucro interno: o transform da raiz é
 * da física.
 */

const PALETTE = {
  graphite: {
    skirt: "#37373d 0%, #1d1d21 42%, #0e0e10 100%",
    top: "#323237 0%, #222226 55%, #1b1b1e 100%",
    rim: "rgb(255 52 59 / 0.8)",
    edge: "rgb(255 255 255 / 0.07)",
    lip: "rgb(255 255 255 / 0.11)",
    under: "rgb(0 0 0 / 0.45)",
    legend: "#ECEAE4",
  },
  red: {
    skirt: "#ff4d53 0%, #e50914 45%, #7d060c 100%",
    top: "#ff3a41 0%, #ec141d 55%, #d10a13 100%",
    rim: "rgb(255 190 190 / 0.35)",
    edge: "rgb(255 255 255 / 0.12)",
    lip: "rgb(255 255 255 / 0.28)",
    under: "rgb(0 0 0 / 0.3)",
    legend: "#FFF6F2",
  },
} as const

export type KeyLight = {
  skirt: Pick<CSSProperties, "background" | "boxShadow">
  top: Pick<CSSProperties, "background" | "boxShadow" | "translate">
}

/**
 * Luz da tecla girada `a` rad. Com `u` (px) devolve valores em px, para o
 * laço da física; sem `u`, em `calc(var(--u) * k)`, para o HTML do servidor.
 */
export function keyLight(tone: KeyTone, a: number, u?: number, lift = 0): KeyLight {
  const p = PALETTE[tone]
  const c = Math.cos(a)
  const s = Math.sin(a)
  const len = (k: number) =>
    u === undefined ? `calc(var(--u) * ${+k.toFixed(4)})` : `${(k * u).toFixed(2)}px`
  // Deslocamento fixo no mundo (dx, dy em u) no eixo da tecla: R(-a)·(dx, dy)
  const world = (dx: number, dy: number) =>
    `${len(c * dx + s * dy)} ${len(c * dy - s * dx)}`
  const deg = `${(180 - (a * 180) / Math.PI).toFixed(1)}deg`
  return {
    skirt: {
      background: `linear-gradient(${deg}, ${p.skirt})`,
      boxShadow: [
        `inset 0 0 0 1px ${p.edge}`,
        // Rim na aresta de baixo (a luz do chão): espalhamento negativo, para
        // acender só a aresta voltada para o chão, sem contornar as laterais
        `inset ${world(0, -0.055)} ${len(0.035)} ${len(-0.02)} ${p.rim}`,
        // Brilho na aresta de cima
        `inset ${world(0, 0.025)} ${len(0.03)} 0 rgb(255 255 255 / 0.12)`,
        // Sombra no chão; maior com a tecla levantada
        `${world(0, 0.1 + lift * 0.12)} ${len(0.16 + lift * 0.2)} ${len(-0.03)} rgb(0 0 0 / 0.72)`,
      ].join(", "),
    },
    top: {
      // Tampo puxado para cima no mundo: a saia de baixo aparece mais, como
      // numa tecla vista um pouco de frente
      translate: world(0, -0.035),
      background: `radial-gradient(120% 90% at 50% 30%, rgb(255 255 255 / 0.05), transparent 60%), linear-gradient(${deg}, ${p.top})`,
      boxShadow: `inset ${world(0, 0.018)} 0 0 ${p.lip}, ${world(0, 0.03)} ${len(0.05)} 0 ${p.under}`,
    },
  }
}

const layers = new WeakMap<HTMLElement, (HTMLElement | null)[]>()

/** Aplica a luz nas duas camadas acesas de uma tecla já montada. */
export function paintKey(el: HTMLElement, light: KeyLight) {
  let l = layers.get(el)
  if (!l) {
    l = [el.querySelector<HTMLElement>("[data-skirt]"), el.querySelector<HTMLElement>("[data-top]")]
    layers.set(el, l)
  }
  if (l[0]) Object.assign(l[0].style, light.skirt)
  if (l[1]) Object.assign(l[1].style, light.top)
}

export function Keycap({
  spec,
  ref,
}: {
  spec: KeySpec
  ref?: Ref<HTMLDivElement>
}) {
  const p = PALETTE[spec.tone]
  const light = keyLight(spec.tone, 0)

  return (
    <div
      ref={ref}
      data-key={spec.id}
      className="group/key pointer-events-auto absolute top-0 left-0 cursor-grab touch-none select-none [-webkit-touch-callout:none] data-[held]:cursor-grabbing [[data-still]_&]:pointer-events-none"
      style={{
        width: `calc(var(--u) * var(--kw, ${spec.w}))`,
        height: "var(--u)",
        willChange: "transform",
      }}
    >
      <div className="ease-out-expo relative size-full transition-[scale] duration-300 pointer-fine:group-hover/key:scale-[1.03] group-data-[held]/key:scale-[1.06]">
        <div
          data-skirt
          className="absolute inset-0 rounded-[calc(var(--u)*0.17)]"
          style={light.skirt}
        />
        <div
          data-top
          className="absolute inset-[calc(var(--u)*0.11)] flex items-center justify-center rounded-[calc(var(--u)*0.12)]"
          style={light.top}
        >
          {spec.legend && (
            <span
              className={cn(
                "font-display leading-none font-bold tracking-[-0.02em] [text-shadow:0_1px_0_rgb(0_0_0/0.35)]",
                spec.accent && "text-red-light",
              )}
              style={{
                fontSize: `calc(var(--u) * ${spec.size ?? 0.42})`,
                fontStretch: "118%",
                color: spec.accent ? undefined : p.legend,
              }}
            >
              {spec.legend}
            </span>
          )}
          {spec.brand && (
            // Barra de espaço com a marca gravada em baixo relevo, discreta
            <span
              className="font-display leading-none font-bold tracking-[0.04em] [text-shadow:0_-1px_0_rgb(0_0_0/0.55),0_1px_0_rgb(255_255_255/0.05)]"
              style={{ fontSize: "calc(var(--u) * 0.17)", fontStretch: "125%" }}
            >
              <span className="text-white/30">JED</span>
              <span className="text-red-light/70">TEC</span>
            </span>
          )}
          {spec.homing && (
            // Saliência do J, como num teclado de verdade
            <span className="absolute bottom-[15%] left-1/2 h-[4%] w-[22%] -translate-x-1/2 rounded-full bg-white/30 shadow-[0_1px_0_rgb(0_0_0/0.4)]" />
          )}
        </div>
      </div>
    </div>
  )
}
