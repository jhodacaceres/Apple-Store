import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { sendWhatsappMessage } from '../_shared/whatsapp-api.ts';

// Envía un mensaje de WhatsApp escrito por un humano desde el panel admin.
// Al responder manualmente, se apaga la IA de esa conversación y se limpia
// la alerta de "requiere intervención humana".
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: corsHeaders });
    }

    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers: corsHeaders });
    }

    const { conversacion_id, contenido } = await req.json();
    if (!conversacion_id || !contenido?.trim()) {
      return new Response(JSON.stringify({ error: 'conversacion_id y contenido son obligatorios' }), { status: 400, headers: corsHeaders });
    }

    const { data: conversacion } = await supabaseAdmin
      .from('conversaciones')
      .select('id, telefono_cliente')
      .eq('id', conversacion_id)
      .single();

    if (!conversacion) {
      return new Response(JSON.stringify({ error: 'Conversación no encontrada' }), { status: 404, headers: corsHeaders });
    }

    const { data: config } = await supabaseAdmin
      .from('configuracion')
      .select('wa_phone_number_id')
      .eq('id', 1)
      .single();

    const sendResult = await sendWhatsappMessage({
      phoneNumberId: config?.wa_phone_number_id ?? '',
      accessToken: Deno.env.get('WHATSAPP_ACCESS_TOKEN') ?? '',
      to: conversacion.telefono_cliente,
      text: contenido,
    });

    if (!sendResult.ok) {
      return new Response(JSON.stringify({ error: sendResult.error ?? 'No se pudo enviar el mensaje' }), { status: 502, headers: corsHeaders });
    }

    const { data: mensaje, error: insertError } = await supabaseAdmin
      .from('mensajes')
      .insert({
        conversacion_id,
        remitente: 'humano',
        contenido,
        wa_message_id: sendResult.messageId,
        estado_entrega: 'enviado',
      })
      .select()
      .single();

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), { status: 500, headers: corsHeaders });
    }

    await supabaseAdmin
      .from('conversaciones')
      .update({ ia_activa: false, requiere_humano: false })
      .eq('id', conversacion_id);

    return new Response(JSON.stringify({ mensaje }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
