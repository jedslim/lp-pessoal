/*
 * Teclas da hero: dados compartilhados entre a cena WebGL
 * (hero-scene-canvas.tsx) e o fallback em imagem (hero-keys.tsx).
 *
 * Posições em `em` da composição da hero (a escala do retrato; o nome usa
 * uma fração dela), a partir do centro da cabeça. Assim as teclas
 * acompanham o retrato em qualquer largura, porque foto, nome e teclas
 * escalam juntos.
 *   lg: centro da cabeça = HERO_HEAD.lg (em da composição)
 *   celular/sm/md: centro da cabeça = HERO_HEAD.sm
 * Zonas livres (ver comentário do topo do hero.tsx): o canto superior
 * esquerdo (antes de "Jedson"), a direita da cabeça, o vão entre o bolso e
 * a orelha e o canto inferior esquerdo, sob os CTAs.
 * No celular entram só ⌘, K e ↵; no tablet (md), as cinco.
 *
 * Interação (as duas versões): a tecla afunda no hover/toque e, no clique,
 * faz uma graça sorteada (HERO_KEY_TRICKS); digitar no teclado de verdade
 * afunda a tecla correspondente e as outras dão um pulinho. Nenhuma tecla
 * abre nada: são um brinquedo.
 *
 * O cursor de vidro (HERO_CURSOR) só aparece aqui no fallback em imagem
 * (celular, reduced motion, sem WebGL). No desktop com GPU ele é a cena
 * própria que visita a página inteira (cursor-companion.tsx).
 *
 * Os dados de pose, luz e escala vêm de public/3d/manifest.json (Blender).
 */

/** Retrato no desktop: largura (em) e posição na composição (hero.tsx:
 *  `lg:w-[4.75em] lg:left-[calc(50%-2.13em)] lg:top-[0.36em]`). */
export const PHOTO_EM_LG = 4.75
/** Centro da cabeça dentro do retrato (frações da largura e da altura). */
export const HEAD_IN_PHOTO = { x: 0.49, y: 0.18 }
/** Centro da cabeça na composição, em em a partir de (50%, topo).
 *  lg: x = -2.13 + 0.49 × 4.75 ≈ 0.2; y = 0.36 + 0.18 × 1.21 × 4.75 ≈ 1.395.
 *  Celular: retrato de 5.5em em 50% - 2.7em, topo 0.55em. */
export const HERO_HEAD = { sm: { x: 0, y: 1.75 }, lg: { x: 0.2, y: 1.395 } }

export type HeroKeyId = "cmd" | "k" | "brackets" | "slash" | "enter"

type Spot = {
  /** Centro da tecla, em em, a partir do centro da cabeça. */
  x: number
  y: number
  /** Largura da base da tecla, em em. */
  size: number
}

export type HeroKeyDef = {
  id: HeroKeyId
  /** Nó do keys.glb (a legenda é o filho `<node>_legend`). */
  node: string
  /** Pose dos renders de fallback (quaternion three.js x, y, z, w). */
  pose: readonly [number, number, number, number]
  /** Desktop (cena 3D e fallback lg). */
  lg: Spot & {
    /** Profundidade no mundo 3D (+ perto, - longe). */
    z: number
    /** Parallax do mouse, em px por unidade de cursor (-1 a 1). */
    par: number
    /** Pose própria da cena 3D (quaternion). Ausente = a do render. */
    pose?: readonly [number, number, number, number]
    /** Cena 3D: distância mínima (px) da caixa dos CTAs (`[data-hero-ctas]`),
     *  sem passar do trilho de baixo (`[data-hero-rail]`), que manda. Corrige
     *  o `y` em em nas telas baixas, onde a conta em em aproxima demais. */
    belowCtas?: number
    /** Saída no scroll: deslocamento (em), profundidade (+ vem para a
     *  câmera, - afunda), giro (rad) e eixo do giro. */
    exit: {
      x: number
      y: number
      z: number
      spin: number
      axis: readonly [number, number, number]
    }
  }
  /** Celular e sm (só o fallback). null = não aparece. */
  sm: Spot | null
  /** Tablet, md (768–1023), só o fallback. Ausente = usa `sm`. Lá sobra
   *  espaço dos dois lados do nome, então entram as cinco teclas. */
  md?: Spot
  /** Teclas reais que afundam esta tecla (KeyboardEvent.key). Qualquer
   *  outra tecla faz esta dar um pulinho. */
  keys: readonly string[]
  /** Fallback: imagem renderizada no Blender. */
  img: { src: string; w: number; h: number }
}

export const HERO_KEYS: readonly HeroKeyDef[] = [
  {
    id: "cmd",
    node: "key_cmd",
    pose: [0.160485, 0.268948, 0.064161, 0.94752],
    lg: {
      // À direita da cabeça, acima de "Santos": a tecla grande
      x: 2.05,
      y: -0.42,
      size: 0.95,
      z: 1.5,
      par: 16,
      exit: { x: 2.6, y: -0.9, z: 4, spin: 2.6, axis: [0.4, 1, 0.25] },
    },
    sm: { x: -1.74, y: -0.12, size: 0.82 },
    keys: ["Meta", "Control", "OS"],
    img: { src: "/3d/key-cmd.webp", w: 720, h: 686 },
  },
  {
    id: "k",
    node: "key_k",
    pose: [0.191308, -0.139893, 0.009586, 0.971463],
    lg: {
      x: 3.15,
      y: 0.78,
      size: 0.74,
      z: 0.4,
      par: 12,
      exit: { x: 2.4, y: 0.2, z: 3, spin: -2.2, axis: [1, 0.3, -0.4] },
    },
    sm: { x: 1.72, y: 0.26, size: 0.7 },
    keys: ["k", "K"],
    img: { src: "/3d/key-k.webp", w: 720, h: 708 },
  },
  {
    id: "brackets",
    node: "key_brackets",
    pose: [0.228899, 0.096872, -0.113307, 0.961968],
    lg: {
      // Acima do ombro direito, perto do topo da cabeça (no fundo)
      x: 1.2,
      y: -1.08,
      size: 0.48,
      z: -3,
      par: 7,
      // As do fundo recolhem para trás da cabeça; as da frente passam
      // pela câmera
      exit: { x: -0.8, y: 1.15, z: -4, spin: 1.8, axis: [0.2, 0.6, 1] },
    },
    sm: null,
    // Tablet: à direita do "n" de "Jedson", acima do K
    md: { x: 2.75, y: -0.78, size: 0.44 },
    keys: ["{", "}", "[", "]"],
    img: { src: "/3d/key-brackets.webp", w: 693, h: 720 },
  },
  {
    id: "slash",
    node: "key_slash",
    pose: [0.119996, -0.119996, 0.138734, 0.975682],
    lg: {
      // Canto superior esquerdo, antes do "J" (no fundo, apagada)
      x: -3.55,
      y: -1.1,
      size: 0.42,
      z: -2.4,
      par: 8,
      exit: { x: 0.75, y: 0.75, z: -3.5, spin: -2, axis: [1, -0.2, 0.3] },
    },
    sm: null,
    // Tablet: à direita do fim de "Santos", abaixo do K
    md: { x: 2.9, y: 1.5, size: 0.4 },
    keys: ["/", "?"],
    img: { src: "/3d/key-slash.webp", w: 720, h: 708 },
  },
  {
    id: "enter",
    node: "key_enter",
    pose: [0.221921, -0.325643, -0.07154, 0.916291],
    lg: {
      // Canto inferior esquerdo, longe dos CTAs e acima dos números
      x: -3.2,
      y: 1.75,
      // Bem menor que o ⌘: a vermelha não disputa com o CTA
      size: 0.58,
      z: 1,
      par: 10,
      belowCtas: 150,
      // De frente para a câmera (face a ~15° dela, legenda quase reta): na
      // pose do render, de cima e girada 39°, o ↵ se lia como um ✓.
      // Euler XYZ (42°, -2°, -8°)
      pose: [0.358577, 0.008741, -0.071353, 0.930728],
      // Sai para baixo e para trás (afunda no escuro, tombando para trás) e
      // recolhe para o ombro: nunca para a borda nem por cima dos números
      exit: { x: 1, y: 0.3, z: -4.5, spin: 1.2, axis: [1, 0.25, 0.1] },
    },
    sm: { x: -1.62, y: 1.02, size: 0.56 },
    keys: ["Enter"],
    img: { src: "/3d/key-enter.webp", w: 720, h: 703 },
  },
]

/** Graças do clique numa tecla (sorteadas, sem repetir a anterior). */
export const HERO_KEY_TRICKS = ["press", "jump", "bounce", "shake", "flick"] as const
export type HeroKeyTrick = (typeof HERO_KEY_TRICKS)[number]

/** Sorteia uma graça diferente da última. */
export function pickTrick(last: HeroKeyTrick | null): HeroKeyTrick {
  const pool = HERO_KEY_TRICKS.filter((t) => t !== last)
  return pool[Math.floor(Math.random() * pool.length)]
}

/**
 * O cursor 3D da cena (manifest.cursor): na cena vira uma peça de vidro
 * (transmissão com refração, aberração cromática leve e iridescência), com
 * o aro em vermelho laqueado e o filete de LED aceso por dentro do vidro. Altura do modelo = 1 unidade; a origem é
 * o hotspot (a ponta). Mesmas convenções das teclas (em a partir do centro
 * da cabeça), mas `size` é a ALTURA da seta em em.
 */
export const HERO_CURSOR = {
  lg: {
    // Embaixo à direita, depois de "Santos", apontando para o K e o nome
    x: 3.24,
    y: 2.3,
    size: 1.3,
    z: 2.2,
    par: 18,
    exit: { x: 1.9, y: 0.9, z: 5, spin: -2.4, axis: [0.3, 1, -0.5] as const },
  },
  /** Celular: à direita, logo abaixo do K, mirando nele. */
  sm: { x: 1.64, y: 0.97, size: 0.76 },
  /** Tablet: à direita do fim de "Santos", abaixo da tecla /. */
  md: { x: 2.6, y: 2.3, size: 0.86 },
  /** Pose 3/4 da cena (manifest.cursor.orientation.hero_3q, x y z w). */
  pose: [-0.122907, -0.293995, 0.007616, 0.947841] as const,
  /** Centro da caixa em relação ao hotspot (unidades do modelo). */
  center: [0.2695, -0.4956, 0] as const,
  /** Estados do corpo (manifest.cursor.states) e do LED. No vidro o filete
   *  fica à mostra: em repouso ele brilha baixo e pulsa (o GLB vem com 1). */
  states: {
    idle: { z: 0, led: 1.3 },
    hover: { z: 0.02051, led: 2.8 },
    down: { z: -0.03589, led: 4.5 },
  },
  /** Fallback: o cursor de vidro vermelho (render 3/4 do cursor-glass.glb,
   *  fundo transparente). A seta ocupa ~86% da altura, centrada. */
  img: { src: "/3d/cursor-glass.png", w: 512, h: 512, fill: 0.86 },
} as const

/** Base da tecla 1u (m) e curso do switch (m): manifest.keys. */
export const KEY_BASE_M = 0.0178
export const KEY_TRAVEL_M = 0.0036

/** Câmera dos renders: 26° acima, de frente. A cena gira o mundo para a
 *  câmera ficar reta e a luz bater igual aos renders. */
export const RENDER_ELEVATION = (26 * Math.PI) / 180

/**
 * Luz de estúdio dos renders (manifest.keys.hero.lights): cada luz de área
 * do Blender vira um plano emissivo. A cena faz um environment com eles via
 * PMREMGenerator: tudo local, sem HDR baixado.
 */
export const HERO_LIGHTS: readonly {
  position: readonly [number, number, number]
  scale: readonly [number, number]
  intensity: number
  color: readonly [number, number, number]
}[] = [
  // key: softbox branca quente, em cima à esquerda
  { position: [-5.2015, 7.4307, 4.2107], scale: [6.4399, 4.2107], intensity: 13.4071, color: [1, 0.97, 0.94] },
  // faixa de cima
  { position: [0.9539, 8.9035, -4.4517], scale: [10.1754, 1.1447], intensity: 9.4708, color: [1, 1, 1] },
  // rim vermelha por trás à direita
  { position: [4.0585, 1.2488, -9.0537], scale: [4.6829, 1.4361], intensity: 79.2592, color: [1, 0.018, 0.03] },
  // rim vermelha por trás à esquerda
  { position: [-3.1607, 0.3161, -9.4821], scale: [3.7928, 1.2643], intensity: 52.2845, color: [1, 0.03, 0.04] },
  // fill frontal
  { position: [-2.2534, 1.2876, 9.6573], scale: [10.3012, 4.5068], intensity: 4.7478, color: [1, 0.98, 0.96] },
  // fill frio lateral
  { position: [7.8363, 0.3265, 6.2037], scale: [8.4893, 8.4893], intensity: 0.4352, color: [0.62, 0.76, 1] },
  // kicker vermelho por baixo
  { position: [1.2739, -7.3247, -6.6878], scale: [6.3693, 2.5477], intensity: 26.9306, color: [1, 0.03, 0.04] },
]
