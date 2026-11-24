import { canConfigure } from "@/lib/auth/roles";

/**
 * K7 — El recorrido guiado del panel: qué se enseña, en qué orden y sobre qué
 * elemento. Puro (sin React) para poder probar qué pasos ve cada quien.
 *
 * `objetivo` es el valor de `data-tour` del elemento a resaltar (los enlaces
 * del menú y de Ajustes lo llevan con su ruta). Sin objetivo, o si no está
 * visible (el menú del teléfono va cerrado), la tarjeta sale centrada.
 */
export type PasoRecorrido = {
  id: string;
  /** Pantalla a la que se va antes de enseñar el paso. */
  ruta?: string;
  objetivo?: string;
  titulo: string;
  texto: string;
  /** Puntos cortos debajo del texto. */
  puntos?: string[];
};

export const RECORRIDO_VISTO = "kooni-recorrido-visto";
export const RECORRIDO_ESTADO = "kooni-recorrido-estado";
/** Evento para abrir el recorrido desde cualquier botón. */
export const EVENTO_RECORRIDO = "kooni:recorrido";

export function pasosDelRecorrido({
  marca,
  role,
  agenda = false,
  woocommerce = false,
}: {
  marca: string;
  role: string;
  agenda?: boolean;
  woocommerce?: boolean;
}): PasoRecorrido[] {
  const configura = canConfigure(role);
  const pasos: PasoRecorrido[] = [
    {
      id: "bienvenida",
      titulo: `Te damos la bienvenida a ${marca}`,
      texto:
        "En un minuto te enseñamos qué hay en cada sección. Puedes salir cuando quieras y repetirlo desde el botón de la brújula del menú.",
    },
    {
      id: "bandeja",
      ruta: "/inbox",
      objetivo: "/inbox",
      titulo: "Bandeja",
      texto: "Todas tus conversaciones de WhatsApp en tiempo real, en un solo lugar.",
      puntos: [
        "Responde, manda fotos, audios y documentos, cita y reacciona.",
        "Notas internas para tu equipo y chats fijados.",
        "Si escribes desde el móvil (coexistencia) también aparece aquí, y la IA se pausa en esa conversación.",
      ],
    },
    {
      id: "pipeline",
      ruta: "/pipeline",
      objetivo: "/pipeline",
      titulo: "Pipeline",
      texto: "Tus oportunidades de venta organizadas por etapas.",
      puntos: [
        "Arrastra cada tarjeta a medida que avanza la venta.",
        "Pon importe y prioridad; los ganados y perdidos se miden solos.",
        "Los pedidos de tu tienda llegan aquí con su importe.",
      ],
    },
    {
      id: "contactos",
      ruta: "/contacts",
      objetivo: "/contacts",
      titulo: "Contactos",
      texto: "La ficha de cada cliente: datos, etapa, de qué anuncio llegó y su historial.",
      puntos: ["Busca y filtra en segundos.", "Importa tu lista desde un archivo CSV."],
    },
  ];

  if (agenda) {
    pasos.push({
      id: "citas",
      ruta: "/bookings",
      objetivo: "/bookings",
      titulo: "Citas",
      texto: "Tu agenda: el asistente propone horarios libres y agenda citas, con recordatorios.",
    });
  }

  if (configura) {
    pasos.push({
      id: "guia",
      ruta: "/onboarding",
      objetivo: "/onboarding",
      titulo: "Guía de inicio",
      texto: "Los pasos para dejarlo todo listo: conectar WhatsApp, activar la IA y preparar a tu asistente.",
    });
  }

  pasos.push(
    {
      id: "agente",
      ruta: "/agent",
      objetivo: "/agent",
      titulo: "Asistente de IA",
      texto: "Define cómo atiende tu asistente: su tono, su rol y todo lo que sabe de tu negocio.",
      puntos: ["Puedes encenderlo o apagarlo cuando quieras.", "Pasa la conversación a una persona cuando hace falta."],
    },
    {
      id: "laboratorio",
      ruta: "/lab",
      objetivo: "/lab",
      titulo: "Laboratorio",
      texto:
        "Clientes simulados ponen a prueba a tu asistente antes de que hable con personas reales. Recibes una nota y sugerencias para mejorarlo.",
    },
    {
      id: "resultados",
      ruta: "/results",
      objetivo: "/results",
      titulo: "Resultados",
      texto: "Cómo va tu negocio: ventas, embudo, tiempos de respuesta y lo que resuelve el asistente.",
    }
  );

  if (configura) {
    pasos.push(
      {
        id: "whatsapp",
        ruta: "/settings/whatsapp",
        objetivo: "/settings/whatsapp",
        titulo: "Conecta tu WhatsApp",
        texto: "Conecta tu número a la API oficial de WhatsApp con un clic.",
        puntos: [
          "«Ya uso WhatsApp Business»: escaneas un código y sigues usando la app en tu móvil.",
          "Se traen hasta 6 meses de conversaciones y tus contactos.",
        ],
      },
      {
        id: "plantillas",
        ruta: "/settings/templates",
        objetivo: "/settings/templates",
        titulo: "Plantillas",
        texto:
          "Mensajes aprobados por WhatsApp. Sirven para escribir tú primero o pasadas 24 horas desde el último mensaje del cliente.",
      }
    );
    if (woocommerce) {
      pasos.push({
        id: "woocommerce",
        ruta: "/settings/woocommerce",
        objetivo: "/settings/woocommerce",
        titulo: "Tu tienda WooCommerce",
        texto: "Conecta tu tienda y cada pedido entra solo: contacto, pipeline y aviso por WhatsApp.",
        puntos: [
          "Descarga el plugin desde aquí y pega la llave en WordPress.",
          "Elige qué mensaje recibe el cliente en cada estado del pedido.",
          "Kooni crea las plantillas de pedidos y las manda a aprobación por ti.",
        ],
      });
    }
    pasos.push(
      {
        id: "equipo",
        ruta: "/settings/team",
        objetivo: "/settings/team",
        titulo: "Equipo",
        texto: "Da acceso a las personas que atienden la bandeja.",
      },
      {
        id: "marca",
        ruta: "/settings/branding",
        objetivo: "/settings/branding",
        titulo: "Tu marca",
        texto: "Tu nombre, logo y colores en todo el panel.",
      }
    );
  }

  pasos.push({
    id: "final",
    ruta: configura ? "/onboarding" : "/inbox",
    titulo: "¡Listo!",
    texto: configura
      ? "Te recomendamos empezar por la Guía de inicio: en unos minutos tendrás tu WhatsApp conectado y a tu asistente listo."
      : "Ya conoces el panel. Empieza por la Bandeja para atender a tus clientes.",
    puntos: ["Puedes repetir este recorrido cuando quieras desde el botón de la brújula del menú."],
  });

  return pasos;
}

/** Puro: dónde va la tarjeta respecto al elemento resaltado. */
export function colocarTarjeta(
  r: { top: number; left: number; right: number; bottom: number; width: number; height: number } | null,
  vista: { w: number; h: number },
  tarjeta: { w: number; h: number },
  margen = 14
): { top: number; left: number; lado: "derecha" | "abajo" | "arriba" | "centro" } {
  const clampX = (x: number) => Math.max(margen, Math.min(x, vista.w - tarjeta.w - margen));
  const clampY = (y: number) => Math.max(margen, Math.min(y, vista.h - tarjeta.h - margen));
  if (!r || vista.w < 640) {
    // En el teléfono, abajo del todo y a lo ancho: no tapa lo resaltado.
    if (r && vista.w < 640) {
      const abajo = r.bottom + margen + tarjeta.h <= vista.h;
      return {
        top: abajo ? clampY(r.bottom + margen) : clampY(r.top - margen - tarjeta.h),
        left: clampX((vista.w - tarjeta.w) / 2),
        lado: abajo ? "abajo" : "arriba",
      };
    }
    return { top: clampY((vista.h - tarjeta.h) / 2), left: clampX((vista.w - tarjeta.w) / 2), lado: "centro" };
  }
  if (r.right + margen + tarjeta.w <= vista.w) {
    return { top: clampY(r.top + r.height / 2 - tarjeta.h / 2), left: r.right + margen, lado: "derecha" };
  }
  if (r.bottom + margen + tarjeta.h <= vista.h) {
    return { top: r.bottom + margen, left: clampX(r.left + r.width / 2 - tarjeta.w / 2), lado: "abajo" };
  }
  return { top: clampY(r.top - margen - tarjeta.h), left: clampX(r.left + r.width / 2 - tarjeta.w / 2), lado: "arriba" };
}
