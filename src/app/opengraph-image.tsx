/* eslint-disable @next/next/no-img-element -- ImageResponse (satori) só aceita <img>, não next/image */
import { ImageResponse } from "next/og"
import { readFile } from "node:fs/promises"
import { join } from "node:path"

// Imagem exibida ao compartilhar o site (WhatsApp, LinkedIn, X, Slack...)
export const alt =
  "Jedson Santos, desenvolvedor full stack (JEDTEC). 80+ projetos no ar."
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const toDataUri = async (file: string) =>
  `data:image/png;base64,${(await readFile(join(process.cwd(), "public", file))).toString("base64")}`

// Satori não lê fonte variável: usa os cortes estáticos da Geist
const font = (file: string) =>
  readFile(join(process.cwd(), "assets/fonts", file))

const INK = "#050506"
const TEXT = "#F2F2F0"
const MUTED = "#9A9AA0"
const RED = "#FF343B"

/** Cruz técnica nos cantos, como nas marcações do site. */
function Cross({ x, y }: { x: number; y: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: x - 7,
        top: y - 7,
        width: 14,
        height: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ position: "absolute", width: 14, height: 1, background: "rgba(255,255,255,0.35)" }} />
      <div style={{ position: "absolute", width: 1, height: 14, background: "rgba(255,255,255,0.35)" }} />
    </div>
  )
}

export default async function Image() {
  const [logo, photo, regular, semibold] = await Promise.all([
    toDataUri("logo-jedtec.png"),
    toDataUri("jed-foto.png"),
    font("Geist-Regular.ttf"),
    font("Geist-SemiBold.ttf"),
  ])

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: INK,
          color: TEXT,
          fontFamily: "Geist",
        }}
      >
        {/* Papel milimetrado */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        {/* Um único brilho, atrás da cabeça */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            backgroundImage:
              "radial-gradient(circle at 76% 34%, rgba(133,8,14,0.7) 0%, rgba(72,6,9,0.3) 22%, transparent 46%)",
          }}
        />

        {/* Foto: o título passa na frente da camiseta, nunca do rosto */}
        <img
          src={photo}
          alt=""
          width={540}
          height={654}
          style={{ position: "absolute", right: 24, top: 44 }}
        />
        {/* Base escurecida: a foto afunda no fundo */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 220,
            display: "flex",
            backgroundImage: `linear-gradient(to bottom, transparent, ${INK} 92%)`,
          }}
        />

        {/* Moldura técnica */}
        <div
          style={{
            position: "absolute",
            left: 40,
            right: 40,
            top: 40,
            bottom: 40,
            display: "flex",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        />
        <Cross x={40} y={40} />
        <Cross x={1160} y={40} />
        <Cross x={40} y={590} />
        <Cross x={1160} y={590} />

        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "78px 80px 76px",
            width: "100%",
            height: "100%",
          }}
        >
          <img src={logo} alt="" width={262} height={31} />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                fontSize: 20,
                letterSpacing: 3.5,
                color: TEXT,
                textTransform: "uppercase",
                marginBottom: 22,
              }}
            >
              <div style={{ width: 36, height: 2, background: RED, marginRight: 16 }} />
              Desenvolvedor full stack
            </div>
            {/* O nome é o título, como no H1 da hero. Linhas explícitas: a
                quebra automática do satori mede alto demais */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: 142,
                fontWeight: 600,
                lineHeight: 0.92,
                letterSpacing: -7,
              }}
            >
              <span>Jedson</span>
              <span>Santos</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: 38,
                fontSize: 24,
                color: TEXT,
              }}
            >
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 999,
                  background: "#34D399",
                  marginRight: 14,
                  boxShadow: "0 0 12px 2px rgba(52,211,153,0.6)",
                }}
              />
              {/* nbsp: o satori abria um vão entre "projetos" e "no" */}
              <span>80+&nbsp;projetos&nbsp;no&nbsp;ar</span>
              <span style={{ color: "rgba(255,255,255,0.22)", margin: "0 18px" }}>/</span>
              <span style={{ color: MUTED }}>jedtec.com.br</span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: regular, weight: 400, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
      ],
    },
  )
}
