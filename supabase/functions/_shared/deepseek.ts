// Cliente mínimo para DeepSeek (API compatible con OpenAI Chat Completions).
// Requiere DEEPSEEK_API_KEY como secret de Edge Function.

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';

export interface HistorialMensaje {
  remitente: 'cliente' | 'ia' | 'humano' | 'sistema';
  contenido: string;
}

export interface RespuestaIA {
  respuesta: string;
  escalar: boolean;
  motivo: string;
}

export async function generarRespuestaIA(opts: {
  apiKey: string;
  modelo: string;
  promptSistema: string;
  catalogoTexto: string;
  historial: HistorialMensaje[];
}): Promise<RespuestaIA> {
  const systemContent = `${opts.promptSistema}

Catálogo vigente (usa exactamente estos precios y disponibilidad, nunca inventes datos):
${opts.catalogoTexto}

Responde SIEMPRE con un único objeto JSON, sin texto adicional, con este formato exacto:
{"respuesta": "<texto para el cliente>", "escalar": <true|false>, "motivo": "<motivo del escalamiento, vacío si escalar es false>"}`;

  const messages = [
    { role: 'system', content: systemContent },
    ...opts.historial
      .filter((m) => m.remitente === 'cliente' || m.remitente === 'ia')
      .map((m) => ({
        role: m.remitente === 'cliente' ? 'user' as const : 'assistant' as const,
        content: m.contenido,
      })),
  ];

  try {
    const res = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: opts.modelo,
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.4,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      return {
        respuesta: '',
        escalar: true,
        motivo: `Error al llamar a DeepSeek (HTTP ${res.status}): ${errBody.slice(0, 300)}`,
      };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(content);

    return {
      respuesta: typeof parsed.respuesta === 'string' ? parsed.respuesta : '',
      escalar: Boolean(parsed.escalar),
      motivo: typeof parsed.motivo === 'string' ? parsed.motivo : '',
    };
  } catch (err) {
    return {
      respuesta: '',
      escalar: true,
      motivo: `No se pudo interpretar la respuesta de la IA: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function buildCatalogoTexto(
  equipos: { modelo: string; color: string | null; capacidad: string | null; precio: number; tipo_dispositivo: string }[],
  accesorios: { nombre: string; categoria: string; precio: number; stock: number }[],
): string {
  const lineasEquipos = equipos.slice(0, 40).map((e) => {
    const nombre = [e.modelo, e.color, e.capacidad].filter(Boolean).join(' ');
    const tipo = e.tipo_dispositivo === 'mac' ? 'Mac' : 'Celular';
    return `- [${tipo}] ${nombre} — Bs ${e.precio}`;
  });
  const lineasAccesorios = accesorios.slice(0, 40).map(
    (a) => `- [${a.categoria}] ${a.nombre} — Bs ${a.precio} (stock: ${a.stock})`,
  );

  if (lineasEquipos.length === 0 && lineasAccesorios.length === 0) {
    return 'No hay productos disponibles en este momento.';
  }

  return [...lineasEquipos, ...lineasAccesorios].join('\n');
}
