import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendWhatsappMessage, verifyMetaSignature } from '../_shared/whatsapp-api.ts';
import { buildCatalogoTexto, generarRespuestaIA } from '../_shared/deepseek.ts';

// Webhook de WhatsApp Cloud API.
// GET  -> verificación de Meta (hub.challenge).
// POST -> mensajes entrantes: registra al cliente y su mensaje, y si la IA
//         está activa para esa conversación, genera y envía la respuesta.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const mode      = url.searchParams.get('hub.mode');
    const token     = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');

    if (mode === 'subscribe' && token === Deno.env.get('WHATSAPP_VERIFY_TOKEN')) {
      return new Response(challenge ?? '', { status: 200 });
    }
    return new Response('Forbidden', { status: 403 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const rawBody = await req.text();

  const signatureValid = await verifyMetaSignature(
    rawBody,
    req.headers.get('x-hub-signature-256'),
    Deno.env.get('WHATSAPP_APP_SECRET') ?? '',
  );
  if (!signatureValid) {
    return new Response('Firma inválida', { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const value = payload?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    // Otros eventos del webhook (confirmaciones de entrega, etc.) — no hay nada que hacer.
    if (!message) {
      return new Response('OK', { status: 200 });
    }

    const from         = message.from as string;
    const waMessageId  = message.id as string;
    const text         = message.text?.body ?? '[mensaje no soportado]';
    const contactName  = value?.contacts?.[0]?.profile?.name ?? null;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Buscar o crear la conversación del cliente.
    const { data: existente } = await supabase
      .from('conversaciones')
      .select('*')
      .eq('telefono_cliente', from)
      .maybeSingle();

    let conversacion = existente;
    if (!conversacion) {
      const { data: creada } = await supabase
        .from('conversaciones')
        .insert({ telefono_cliente: from, nombre_cliente: contactName })
        .select()
        .single();
      conversacion = creada;
    } else if (contactName && conversacion.nombre_cliente !== contactName) {
      await supabase.from('conversaciones').update({ nombre_cliente: contactName }).eq('id', conversacion.id);
    }

    if (!conversacion) {
      return new Response('OK', { status: 200 });
    }

    await supabase.from('mensajes').insert({
      conversacion_id: conversacion.id,
      remitente: 'cliente',
      contenido: text,
      wa_message_id: waMessageId,
      estado_entrega: 'entregado',
    });

    const { data: config } = await supabase
      .from('configuracion')
      .select('*')
      .eq('id', 1)
      .single();

    if (config?.ia_activa_global && conversacion.ia_activa) {
      const [{ data: equiposDisponibles }, { data: accesoriosActivos }, { data: historialRaw }] = await Promise.all([
        supabase
          .from('equipos')
          .select('modelo, color, capacidad, precio, tipo_dispositivo')
          .eq('estado', 'disponible')
          .eq('visible_catalogo', true),
        supabase
          .from('accesorios')
          .select('nombre, categoria, precio, stock')
          .eq('activo', true)
          .gt('stock', 0),
        supabase
          .from('mensajes')
          .select('remitente, contenido')
          .eq('conversacion_id', conversacion.id)
          .order('creado_en', { ascending: false })
          .limit(20),
      ]);

      const historial = (historialRaw ?? []).reverse();
      const catalogoTexto = buildCatalogoTexto(equiposDisponibles ?? [], accesoriosActivos ?? []);

      const deepseekKey = Deno.env.get('DEEPSEEK_API_KEY') ?? '';
      const iaResult = await generarRespuestaIA({
        apiKey: deepseekKey,
        modelo: config.ia_modelo,
        promptSistema: config.ia_prompt_sistema,
        catalogoTexto,
        historial,
      });

      if (iaResult.escalar || !iaResult.respuesta) {
        await supabase
          .from('conversaciones')
          .update({ ia_activa: false, requiere_humano: true })
          .eq('id', conversacion.id);

        await supabase.from('mensajes').insert({
          conversacion_id: conversacion.id,
          remitente: 'sistema',
          contenido: iaResult.motivo || 'La IA determinó que esta conversación requiere intervención humana.',
        });
      } else {
        const sendResult = await sendWhatsappMessage({
          phoneNumberId: config.wa_phone_number_id ?? '',
          accessToken: Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '',
          to: from,
          text: iaResult.respuesta,
        });

        await supabase.from('mensajes').insert({
          conversacion_id: conversacion.id,
          remitente: 'ia',
          contenido: iaResult.respuesta,
          wa_message_id: sendResult.messageId,
          estado_entrega: sendResult.ok ? 'enviado' : 'fallido',
        });
      }
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('whatsapp-webhook error:', err);
    // Responder 200 igual: Meta reintenta agresivamente ante errores 5xx.
    return new Response('OK', { status: 200 });
  }
});
