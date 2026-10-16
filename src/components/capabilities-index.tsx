import { stack } from "@/lib/stack"

/**
 * As quatro frentes das Capacidades, na ordem em que se revezam no scroll.
 * `kicker` diz o que dá para fazer no playground daquela frente. `tools` são
 * nomes do `stack` (logo e nome viram os chips); os que não estão no stack
 * entram só como texto.
 */
export const CAP_ITEMS = [
  {
    id: "cap-web",
    kicker: "Arraste e veja o layout mudar",
    title: "Desenvolvimento web",
    text: "Sites e aplicações em Next.js e React que carregam rápido, tiram nota alta no Lighthouse e se ajustam a qualquer tela.",
    tools: ["Next.js", "React", "TypeScript", "Tailwind CSS", "Vercel"],
  },
  {
    id: "cap-wordpress",
    kicker: "Edite um site pelo painel",
    title: "WordPress sob medida",
    text: "Temas feitos do zero, campos bem modelados no ACF e WordPress headless. Quem cuida do conteúdo edita tudo pelo painel, sem depender de um dev.",
    tools: ["WordPress", "ACF", "PHP", "MySQL"],
  },
  {
    id: "cap-automacao",
    kicker: "Envie e veja o fluxo rodar",
    title: "Integrações e automação",
    text: "Ligo o site ao CRM, ao WhatsApp e a outras APIs, e monto fluxos no n8n para o trabalho repetitivo rodar sozinho.",
    tools: ["n8n", "Node.js", "APIs REST", "WhatsApp", "Supabase"],
  },
  {
    id: "cap-ia",
    kicker: "Peça uma tarefa e revise",
    title: "IA aplicada",
    text: "Uso IA no meu fluxo para entregar mais rápido, e crio automações e agentes que resolvem problemas reais. A palavra final é sempre de uma pessoa.",
    tools: ["Claude", "ChatGPT", "Gemini", "Cursor"],
  },
] as const

export type CapItem = (typeof CAP_ITEMS)[number]

/** Logo (path 24×24 do simple-icons) de uma ferramenta do stack, se houver. */
export function toolPath(name: string) {
  return stack.find((t) => t.name === name)?.path
}
