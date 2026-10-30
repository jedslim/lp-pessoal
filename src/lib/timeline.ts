/**
 * Linha do tempo da seção Sobre (home). Um marco por ponto da régua, em
 * ordem. RASCUNHO: anos e textos estimados, a confirmar com o Jedson.
 */
export type Milestone = {
  /** Rótulo na régua (ano ou "Hoje"). */
  when: string
  title: string
  text: string
}

export const timeline: Milestone[] = [
  {
    when: "2022",
    title: "Primeiros projetos",
    text: "Sites e landing pages em WordPress como freela, aprendendo na prática com cliente de verdade.",
  },
  {
    when: "2023",
    title: "Agência ILI",
    text: "Entro no time da Agência ILI e passo a desenvolver sites para marcas de vários segmentos.",
  },
  {
    when: "2024",
    title: "Front moderno",
    text: "Next.js e React no front, com WordPress headless por trás: o conteúdo continua fácil de editar.",
  },
  {
    when: "2025",
    title: "Automação e IA",
    text: "Fluxos no n8n e IA aplicada nos projetos. Curso de arquitetura de multiagentes na StartSe.",
  },
  {
    when: "Hoje",
    title: "80+ projetos no ar",
    text: "Sites, sistemas e automações entregues, e projetos próprios em paralelo.",
  },
]
