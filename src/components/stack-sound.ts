"use client"

/*
 * Som das teclas do Stack, sintetizado na hora com WebAudio (nenhum arquivo).
 * Começa MUDO: quem liga é o botão de volume do teclado. O AudioContext só
 * nasce num gesto do usuário (clique, toque ou tecla), como os navegadores
 * exigem, e nada toca sozinho no modo vitrine.
 */

type Listener = () => void

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let volume = 0
/** Último volume audível: o clique no botão volta para ele. */
let lastAudible = 60
const listeners = new Set<Listener>()

const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)))

/** Curva perceptiva: metade do botão não é metade do barulho. */
const gainOf = (v: number) => (v / 100) ** 2 * 0.9

function ensure() {
  if (typeof window === "undefined") return null
  if (!ctx) {
    const AC =
      window.AudioContext ??
      (window as typeof window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    // Um compressor na saída: a onda de luz dispara várias teclas juntas
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -14
    comp.ratio.value = 6
    comp.connect(ctx.destination)
    master = ctx.createGain()
    master.gain.value = gainOf(volume)
    master.connect(comp)
    // 60 ms de ruído branco: o "clique" do switch sai daqui, filtrado
    noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.06), ctx.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  }
  if (ctx.state === "suspended") void ctx.resume()
  return ctx
}

export const keySound = {
  get: () => volume,
  set(v: number) {
    volume = clamp(v)
    if (volume > 0) lastAudible = volume
    if (master && ctx) master.gain.setTargetAtTime(gainOf(volume), ctx.currentTime, 0.02)
    listeners.forEach((l) => l())
  },
  /** Liga/desliga, lembrando o último volume. */
  toggle() {
    ensure()
    keySound.set(volume > 0 ? 0 : lastAudible)
  },
  /** Chamado num gesto: cria o contexto de áudio antes do 1º som. */
  prime: () => void ensure(),
  subscribe(l: Listener) {
    listeners.add(l)
    return () => {
      listeners.delete(l)
    }
  },
}

/**
 * Um "thock" de teclado mecânico: um corpo grave e curto (seno que cai de
 * tom) e o clique do switch (ruído num passa-faixa). `tone` (0–1) muda o
 * timbre por tecla, para a fileira não soar como uma tecla só.
 */
export function playKey(tone = 0.5, strength = 1, delay = 0) {
  if (volume <= 0) return
  const c = ensure()
  if (!c || !master || !noise) return
  const t = c.currentTime + 0.005 + delay

  const body = c.createOscillator()
  body.type = "sine"
  const f = 120 + tone * 90
  body.frequency.setValueAtTime(f, t)
  body.frequency.exponentialRampToValueAtTime(f * 0.42, t + 0.08)
  const bodyGain = c.createGain()
  bodyGain.gain.setValueAtTime(0.0001, t)
  bodyGain.gain.exponentialRampToValueAtTime(0.7 * strength, t + 0.004)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.11)
  body.connect(bodyGain).connect(master)
  body.start(t)
  body.stop(t + 0.12)

  const click = c.createBufferSource()
  click.buffer = noise
  const band = c.createBiquadFilter()
  band.type = "bandpass"
  band.frequency.value = 1500 + tone * 1600
  band.Q.value = 0.9
  const clickGain = c.createGain()
  clickGain.gain.setValueAtTime(0.0001, t)
  clickGain.gain.exponentialRampToValueAtTime(0.6 * strength, t + 0.002)
  clickGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04)
  click.connect(band).connect(clickGain).connect(master)
  click.start(t)
  click.stop(t + 0.06)
}
