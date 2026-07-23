// Helpers para la WhatsApp Cloud API (Meta).
// Requiere WHATSAPP_ACCESS_TOKEN como secret de Edge Function.

const WHATSAPP_API_VERSION = 'v21.0';

export interface SendWhatsappResult {
  ok: boolean;
  messageId: string | null;
  error?: string;
}

export async function sendWhatsappMessage(opts: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  text: string;
}): Promise<SendWhatsappResult> {
  if (!opts.phoneNumberId) {
    return { ok: false, messageId: null, error: 'wa_phone_number_id no configurado' };
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${opts.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${opts.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: opts.to,
          type: 'text',
          text: { body: opts.text },
        }),
      },
    );

    const body = await res.json();
    if (!res.ok) {
      return { ok: false, messageId: null, error: body?.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, messageId: body?.messages?.[0]?.id ?? null };
  } catch (err) {
    return { ok: false, messageId: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Verifica la firma HMAC SHA-256 que Meta envía en X-Hub-Signature-256. */
export async function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): Promise<boolean> {
  if (!signatureHeader || !appSecret) return false;
  const expected = signatureHeader.replace('sha256=', '');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const digestHex = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(expected, digestHex);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
