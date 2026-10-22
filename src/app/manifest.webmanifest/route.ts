import { DEFAULT_BRANDING } from "@/lib/branding";
import { faviconHref } from "@/lib/favicon";
import { productName } from "@/lib/channels";
import { getBranding } from "@/server/branding";
import { enabledChannels } from "@/server/channels/enabled";

export const dynamic = "force-dynamic";

/**
 * Manifest PWA dinámico: el nombre y el icono generado salen de la marca de la
 * organización. Los PNG estáticos son el respaldo que Android exige para
 * instalar; el SVG refleja el logo white-label en los navegadores que lo usan.
 */
export async function GET() {
  const branding = await getBranding().catch(() => DEFAULT_BRANDING);
  const producto = productName([...enabledChannels()]);
  const iconType = branding.favicon?.mime || "image/svg+xml";
  // Bajo el icono no cabe el nombre completo. Se corta en palabra, no a
  // mitad de una: «Nocodeveloper CRM» → «Nocodeveloper», no «Nocodevelope».
  const shortName =
    branding.name.length <= 12
      ? branding.name
      : (branding.name.split(/\s+/)[0] ?? branding.name).slice(0, 12);

  const manifest = {
    id: "/",
    name: `${branding.name} — ${producto}`,
    short_name: shortName,
    description: `${producto} con agente de IA y Laboratorio de auto-evaluación`,
    lang: "es",
    dir: "ltr",
    start_url: "/inbox",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    background_color: "#0A0C0A",
    theme_color: "#0A0C0A",
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: faviconHref(branding),
        sizes: "any",
        type: iconType,
        purpose: "any",
      },
      { src: "/pwa-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/pwa-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "content-type": "application/manifest+json",
      "cache-control": "public, max-age=60",
    },
  });
}
