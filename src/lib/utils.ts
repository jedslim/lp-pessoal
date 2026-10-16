import { createCn } from "cn/config"

// As utilities próprias (globals.css) ganham grupo próprio: sem isso o merge
// acha que `text-label`/`text-display` são cor de texto e apaga a classe
// quando vem um `text-ink` depois (o SectionLabel perdia o mono/caixa alta).
// `text-h2` é tamanho de fonte e `pb-h2-base` é padding: entram nesses grupos.
export const cn = createCn({
  extend: {
    classGroups: {
      "jed-text-display": ["text-display"],
      "jed-text-display-2": ["text-display-2"],
      "jed-text-label": ["text-label"],
      "jed-text-outline": ["text-outline"],
      "font-size": [{ text: ["h2"] }],
      pb: [{ pb: ["h2-base"] }],
    },
  },
})
