import {
  siClaude,
  siCursor,
  siFigma,
  siGithubcopilot,
  siGooglegemini,
  siJavascript,
  siMysql,
  siN8n,
  siNextdotjs,
  siNodedotjs,
  siPhp,
  siPostman,
  siReact,
  siShadcnui,
  siSupabase,
  siTailwindcss,
  siTypescript,
  siVercel,
  siWhatsapp,
  siWordpress,
} from "simple-icons"
import { openaiPath } from "@/components/brand-icons"

export type StackCategory = "front" | "cms" | "integracoes" | "ia"

export const stackCategories: Record<
  StackCategory,
  { label: string; short: string }
> = {
  front: { label: "Front-end", short: "Front" },
  cms: { label: "CMS & Back", short: "CMS/Back" },
  integracoes: { label: "Integrações", short: "Integra" },
  ia: { label: "IA aplicada", short: "IA" },
}

export type StackElement = {
  /** Número "atômico": ordem na tabela. */
  n: number
  /** Símbolo de duas letras. */
  symbol: string
  name: string
  category: StackCategory
  /** Path SVG 24×24 (simple-icons); sem path, vira só o símbolo. */
  path?: string
  /** Uma linha: para que eu uso. */
  use: string
}

const el = (
  n: number,
  symbol: string,
  name: string,
  category: StackCategory,
  use: string,
  path?: string,
): StackElement => ({ n, symbol, name, category, use, path })

/** O stack do dia a dia, agrupado por frente de trabalho. */
export const stack: StackElement[] = [
  el(1, "Nx", "Next.js", "front", "Sites e aplicações com renderização no servidor.", siNextdotjs.path),
  el(2, "Re", "React", "front", "Interfaces em componentes reutilizáveis.", siReact.path),
  el(3, "Ts", "TypeScript", "front", "Tipagem que pega o erro antes do deploy.", siTypescript.path),
  el(4, "Tw", "Tailwind CSS", "front", "Design system direto no markup.", siTailwindcss.path),
  el(5, "Sh", "shadcn/ui", "front", "Componentes acessíveis, com o código na mão.", siShadcnui.path),
  el(6, "Fg", "Figma", "front", "Do layout ao componente sem perder detalhe.", siFigma.path),
  el(7, "Vc", "Vercel", "front", "Deploy contínuo e preview a cada mudança.", siVercel.path),
  el(8, "Wp", "WordPress", "cms", "Temas feitos do zero e WordPress headless.", siWordpress.path),
  el(9, "Ac", "ACF", "cms", "Campos bem modelados: o cliente edita sozinho."),
  el(10, "Ph", "PHP", "cms", "Temas, plugins e hooks próprios no WordPress.", siPhp.path),
  el(11, "Js", "JavaScript", "cms", "Interações e scripts dentro dos temas WordPress.", siJavascript.path),
  el(12, "My", "MySQL", "cms", "Os dados por trás do WordPress.", siMysql.path),
  el(13, "Nd", "Node.js", "integracoes", "APIs, scripts e integrações no servidor.", siNodedotjs.path),
  el(14, "N8", "n8n", "integracoes", "Fluxos de automação entre sistemas.", siN8n.path),
  el(15, "Sb", "Supabase", "integracoes", "Banco, autenticação e storage sem montar infra.", siSupabase.path),
  el(16, "Wa", "WhatsApp", "integracoes", "Mensagens automáticas e atendimento.", siWhatsapp.path),
  el(17, "Pm", "Postman", "integracoes", "Testar e documentar integrações.", siPostman.path),
  el(18, "Ap", "APIs REST", "integracoes", "Ligar o site a CRM, ERP e o que mais vier."),
  el(19, "Cl", "Claude", "ia", "Par de programação e base de agentes.", siClaude.path),
  el(20, "Gp", "ChatGPT", "ia", "Explorar ideias, revisar e prototipar.", openaiPath),
  el(21, "Gm", "Gemini", "ia", "Tarefas com imagem, áudio ou PDF junto do texto.", siGooglegemini.path),
  el(22, "Cu", "Cursor", "ia", "Editor com IA integrado ao meu fluxo.", siCursor.path),
  el(23, "Cp", "Copilot", "ia", "Autocomplete que poupa digitação repetida.", siGithubcopilot.path),
]
