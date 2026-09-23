import { ImageResponse } from "next/og";
import { businessInfo, siteConfig } from "@/config/site";

/**
 * Imagen de vista previa (Open Graph / Twitter Card) generada en build, no un
 * PNG versionado: así el texto siempre coincide con `config/site.ts` y no hay
 * un binario que se desactualice. Next la sirve y enlaza automáticamente por
 * convención de archivo — no hay que declararla en `metadata.openGraph.images`.
 *
 * 1200×630 es la proporción que piden WhatsApp, Facebook, LinkedIn y X; en
 * Costa Rica el tráfico de referencia llega sobre todo por WhatsApp, así que
 * esta imagen es lo primero que ve quien recibe el enlace compartido.
 */
export const alt = `${businessInfo.legalName} — Servicios de topografía en Costa Rica`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#262f66";
const PAPER = "#fefeda";
const ACCENT = "#8f9bff";
const SLATE = "#b9bddb";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NAVY,
          padding: "72px 80px",
          position: "relative",
        }}
      >
        {/* Motivo de triangulación, mismo lenguaje que el fondo del sitio. */}
        <svg
          width="560"
          height="560"
          viewBox="0 0 560 560"
          style={{ position: "absolute", right: -80, top: -60, opacity: 0.22 }}
        >
          <path
            d="M280 60 L60 460 L500 460 Z"
            fill="none"
            stroke={PAPER}
            strokeWidth="3"
          />
          <path d="M280 60 L280 460" fill="none" stroke={ACCENT} strokeWidth="2" />
          <path d="M60 460 L500 60" fill="none" stroke={PAPER} strokeWidth="1.5" />
          {[
            [280, 60],
            [60, 460],
            [500, 460],
            [280, 460],
          ].map(([x, y]) => (
            <path
              key={`${x}-${y}`}
              d={`M${x - 14} ${y} H${x + 14} M${x} ${y - 14} V${y + 14}`}
              stroke={PAPER}
              strokeWidth="3"
            />
          ))}
        </svg>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 26,
              letterSpacing: 6,
              textTransform: "uppercase",
              color: SLATE,
              fontWeight: 600,
            }}
          >
            Topografía · Costa Rica
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 76,
              lineHeight: 1.08,
              fontWeight: 700,
              color: PAPER,
              maxWidth: 820,
              letterSpacing: -1.5,
            }}
          >
            Levantamientos, planos catastrados y trámites
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: PAPER, letterSpacing: -0.5 }}>
              {businessInfo.legalName}
            </div>
            <div style={{ marginTop: 10, fontSize: 24, color: SLATE }}>
              Referenciado a CR-SIRGAS (CRTM05) · Cobertura nacional
            </div>
          </div>
          <div
            style={{
              fontSize: 22,
              color: SLATE,
              borderLeft: `3px solid ${ACCENT}`,
              paddingLeft: 18,
            }}
          >
            {siteConfig.domain}
          </div>
        </div>
      </div>
    ),
    size
  );
}
